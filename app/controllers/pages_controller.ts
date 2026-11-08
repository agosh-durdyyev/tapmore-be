import type { HttpContext } from '@adonisjs/core/http'
import { linkActive, validSchedule } from '#services/link_schedule'
import { orderByClicks, recentClicks } from '#services/smart_order'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import {
  draftValidator,
  pageValidator,
  reservedUsernames,
  usernameValidator,
} from '#validators/page'
import { addVersion, checkpoint, latestVersion, sameContent } from '#services/page_versions'
import { contentIssues, textIssue } from '#services/content_policy'

export default class PagesController {
  async availability({ params }: HttpContext) {
    const { username } = await usernameValidator.validate({ username: params.username })
    if (textIssue(username.replace(/[_-]+/g, ' '), 'Your page address'))
      return { username, available: false, reason: 'CONTENT_NOT_ALLOWED' }
    const exists = await db.from('pages').where('username', username).first()
    return { username, available: !reservedUsernames.has(username) && !exists }
  }

  async show({ auth, response }: HttpContext) {
    const page = await db.from('pages').where('user_id', auth.getUserOrFail().id).first()
    if (!page) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    response.header('Cache-Control', 'no-store')
    return {
      page: page.draft,
      published: page.published,
      publishedAt: page.published_at,
      revision: page.revision,
    }
  }

  /**
   * Saves the draft to the account without publishing. Autosave calls this after
   * each edit with `If-Match: <revision>`; a stale revision means another device
   * saved first, so the client is asked to choose instead of overwriting.
   * The address is claimed only when it is free; publishing makes the final claim.
   */
  async update({ auth, request, response }: HttpContext) {
    const draft = await request.validateUsing(draftValidator)
    if (draft.links.some((link) => !validSchedule(link)))
      return response.unprocessableEntity({ code: 'INVALID_SCHEDULE' })
    const issues = contentIssues(draft)
    if (issues.length)
      return response.unprocessableEntity({ code: 'CONTENT_NOT_ALLOWED', errors: issues })
    const ifMatch = request.header('if-match')
    const baseRevision = ifMatch === undefined ? null : Number(ifMatch.replace(/"/g, ''))
    const userId = auth.getUserOrFail().id
    const result = await db.transaction(async (trx) => {
      await trx.from('users').where('id', userId).forUpdate().firstOrFail()
      let row = await trx.from('pages').where('user_id', userId).forUpdate().first()
      if (row && baseRevision !== null && baseRevision !== row.revision)
        return { conflict: { page: row.draft, revision: row.revision } }
      if (row?.published && draft.username !== row.username) return { locked: true as const }
      if (!row) {
        const [created] = await trx
          .table('pages')
          .insert({ user_id: userId, username: null, draft: JSON.stringify(draft) })
          .returning('*')
        row = created
      }
      const username = await claimUsername(trx, row, draft.username)
      const revision = row.revision + 1
      await trx
        .from('pages')
        .where('id', row.id)
        .update({ draft: JSON.stringify(draft), revision, updated_at: new Date() })
      await checkpoint(trx, row.id, draft)
      return { revision, usernameAvailable: !draft.username || username === draft.username }
    })
    if ('conflict' in result)
      return response.conflict({ code: 'DRAFT_CONFLICT', ...result.conflict })
    if ('locked' in result) return response.conflict({ code: 'PUBLISHED_USERNAME_LOCKED' })
    return { page: draft, ...result }
  }

  async publish({ auth, response }: HttpContext) {
    const result = await db.transaction(async (trx) => {
      const row = await trx
        .from('pages')
        .where('user_id', auth.getUserOrFail().id)
        .forUpdate()
        .first()
      if (!row) return null
      if (!row.draft.username) return { error: 'USERNAME_REQUIRED' as const }
      const draft = await pageValidator.validate(row.draft)
      if (draft.links.some((link) => !validSchedule(link)))
        return { error: 'INVALID_SCHEDULE' as const }
      const issues = contentIssues(draft)
      if (issues.length) return { issues }
      if ((await claimUsername(trx, row, draft.username)) !== draft.username)
        return { error: 'USERNAME_UNAVAILABLE' as const }
      const latest = await latestVersion(trx, row.id)
      const version =
        latest && sameContent(latest.content, draft)
          ? latest
          : await addVersion(trx, row.id, draft, 'publish')
      await trx
        .from('pages')
        .where('id', row.id)
        .update({
          published: JSON.stringify(draft),
          published_version_id: version.id,
          published_at: new Date(),
        })
      return { page: draft, version: version.number }
    })
    if (!result) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    if ('issues' in result)
      return response.unprocessableEntity({ code: 'CONTENT_NOT_ALLOWED', errors: result.issues })
    if ('error' in result)
      return result.error === 'USERNAME_REQUIRED' || result.error === 'INVALID_SCHEDULE'
        ? response.unprocessableEntity({ code: result.error })
        : response.conflict({ code: result.error })
    return { username: result.page.username, published: true, version: result.version }
  }

  async unpublish({ auth, response }: HttpContext) {
    const affected = await db.transaction(async (trx) => {
      const row = await trx
        .from('pages')
        .where('user_id', auth.getUserOrFail().id)
        .forUpdate()
        .first()
      if (!row) return 0
      // A test cannot outlive the page it splits traffic for.
      await trx
        .from('experiments')
        .where({ page_id: row.id, status: 'running' })
        .update({ status: 'stopped', ended_at: new Date() })
      return trx
        .from('pages')
        .where('id', row.id)
        .update({ published: null, published_version_id: null, published_at: null })
    })
    if (!affected) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    return response.noContent()
  }

  /** Published addresses for the landing site's sitemap. Usernames only, nothing private. */
  async publicIndex({ response }: HttpContext) {
    const rows = await db
      .from('pages')
      .whereNotNull('published')
      .orderBy('published_at', 'desc')
      .limit(50000)
      .select('username', 'published_at')
    response.header('Cache-Control', 'public, max-age=3600')
    return {
      pages: rows.map((row) => ({ username: row.username, publishedAt: row.published_at })),
    }
  }

  /**
   * The live page, or one variant of a running A/B test chosen at random per
   * request (no cookie). `?experiment=off` always returns the live page; the
   * landing site sends it for visitors with Do Not Track or Global Privacy Control.
   */
  async publicPage({ params, request, response }: HttpContext) {
    const row = await db
      .from('pages')
      .where('username', String(params.username).toLowerCase())
      .whereNotNull('published')
      .first()
    response.header('Cache-Control', 'no-store')
    if (!row) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    const variant = request.qs().experiment === 'off' ? null : await pickVariant(row.id)
    const content = variant ? { ...variant.content, username: row.username } : row.published
    let links = content.links.filter((link: Parameters<typeof linkActive>[0]) => linkActive(link))
    // An A/B test compares fixed orders, so smart order waits until it ends.
    if (content.smartOrder && !variant) links = orderByClicks(links, await recentClicks(row.id))
    return {
      page: { ...content, links },
      variant: variant?.id ?? null,
    }
  }
}

/**
 * Reserves `wanted` for this page when it is free and returns the address the
 * page now holds. A savepoint keeps a lost race from aborting the outer save.
 */
async function claimUsername(
  trx: TransactionClientContract,
  row: { id: number; username: string | null; published: unknown },
  wanted: string
): Promise<string | null> {
  if (row.username === wanted) return wanted
  if (row.published) return row.username
  if (!wanted) {
    await trx.from('pages').where('id', row.id).update({ username: null })
    return null
  }
  if (reservedUsernames.has(wanted)) return row.username
  try {
    await trx.transaction(async (savepoint) => {
      await savepoint.from('pages').where('id', row.id).update({ username: wanted })
    })
    return wanted
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505')
      return row.username
    throw error
  }
}

async function pickVariant(pageId: number) {
  const variants = await db
    .from('experiment_variants as v')
    .join('experiments as e', 'e.id', 'v.experiment_id')
    .join('page_versions as p', 'p.id', 'v.version_id')
    .where('e.page_id', pageId)
    .where('e.status', 'running')
    .orderBy('v.id')
    .select('v.id', 'v.weight', 'p.content')
  if (!variants.length) return null
  const total = variants.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of variants) {
    roll -= item.weight
    if (roll < 0) return item
  }
  return variants[variants.length - 1]
}

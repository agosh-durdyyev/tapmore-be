import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { pageValidator, reservedUsernames, usernameValidator } from '#validators/page'

export default class PagesController {
  async availability({ params }: HttpContext) {
    const { username } = await usernameValidator.validate({ username: params.username })
    const exists = await db.from('pages').where('username', username).first()
    return { username, available: !reservedUsernames.has(username) && !exists }
  }

  async show({ auth, response }: HttpContext) {
    const page = await db.from('pages').where('user_id', auth.getUserOrFail().id).first()
    if (!page) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    response.header('Cache-Control', 'no-store')
    return { page: page.draft, published: page.published, publishedAt: page.published_at }
  }

  async update({ auth, request, response }: HttpContext) {
    const draft = await request.validateUsing(pageValidator)
    if (reservedUsernames.has(draft.username))
      return response.conflict({ code: 'USERNAME_UNAVAILABLE' })
    const userId = auth.getUserOrFail().id
    try {
      // The unique username index resolves competing claims atomically.
      await db.transaction(async (trx) => {
        await trx.from('users').where('id', userId).forUpdate().firstOrFail()
        const existing = await trx.from('pages').where('user_id', userId).forUpdate().first()
        const values = { draft: JSON.stringify(draft), updated_at: new Date() }
        if (existing) {
          // Published URLs remain stable until an explicit unpublish.
          if (existing.published && existing.username !== draft.username) {
            const error = new Error('Unpublish before changing username')
            Object.assign(error, { code: 'PUBLISHED_USERNAME_LOCKED' })
            throw error
          }
          await trx
            .from('pages')
            .where('id', existing.id)
            .update({ ...values, username: draft.username })
        } else {
          await trx.table('pages').insert({ ...values, user_id: userId, username: draft.username })
        }
      })
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : null
      if (code === '23505') return response.conflict({ code: 'USERNAME_UNAVAILABLE' })
      if (code === 'PUBLISHED_USERNAME_LOCKED') return response.conflict({ code })
      throw error
    }
    return { page: draft }
  }

  async publish({ auth, response }: HttpContext) {
    const page = await db.transaction(async (trx) => {
      const row = await trx
        .from('pages')
        .where('user_id', auth.getUserOrFail().id)
        .forUpdate()
        .first()
      if (!row) return null
      const draft = await pageValidator.validate(row.draft)
      await trx
        .from('pages')
        .where('id', row.id)
        .update({ published: JSON.stringify(draft), published_at: new Date() })
      return draft
    })
    if (!page) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    return { username: page.username, published: true }
  }

  async unpublish({ auth, response }: HttpContext) {
    const affected = await db
      .from('pages')
      .where('user_id', auth.getUserOrFail().id)
      .update({ published: null, published_at: null })
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

  async publicPage({ params, response }: HttpContext) {
    const row = await db
      .from('pages')
      .where('username', String(params.username).toLowerCase())
      .whereNotNull('published')
      .first()
    response.header('Cache-Control', 'no-store')
    if (!row) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    return {
      page: {
        ...row.published,
        links: row.published.links.filter((link: { visible: boolean }) => link.visible),
      },
    }
  }
}

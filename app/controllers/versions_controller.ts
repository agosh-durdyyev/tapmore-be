import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { draftValidator } from '#validators/page'
import { addVersion, checkpoint, maxVersions, versionSummary } from '#services/page_versions'

const labelValidator = vine.create({
  label: vine.string().trim().maxLength(80).optional(),
})

/** Version history for the signed-in user's page. Versions never change once written. */
export default class VersionsController {
  async index({ auth, response }: HttpContext) {
    const page = await db.from('pages').where('user_id', auth.getUserOrFail().id).first()
    response.header('Cache-Control', 'no-store')
    if (!page) return { versions: [] }
    const rows = await db
      .from('page_versions')
      .where('page_id', page.id)
      .orderBy('number', 'desc')
      .limit(maxVersions)
      .select('id', 'number', 'source', 'label', 'created_at')
    return {
      versions: rows.map((row) => versionSummary(row, page.published_version_id, row.id)),
    }
  }

  async show({ auth, params, response }: HttpContext) {
    const page = await db.from('pages').where('user_id', auth.getUserOrFail().id).first()
    const row = page
      ? await db
          .from('page_versions')
          .where({ page_id: page.id, number: Number(params.number) || 0 })
          .first()
      : null
    if (!row) return response.notFound({ code: 'VERSION_NOT_FOUND' })
    response.header('Cache-Control', 'no-store')
    return {
      version: { ...versionSummary(row, page.published_version_id, row.id), page: row.content },
    }
  }

  /** "Save version": snapshot the current draft with an optional name. */
  async store({ auth, request, response }: HttpContext) {
    const { label } = await request.validateUsing(labelValidator)
    const result = await db.transaction(async (trx) => {
      const page = await trx
        .from('pages')
        .where('user_id', auth.getUserOrFail().id)
        .forUpdate()
        .first()
      if (!page) return null
      const row = await addVersion(trx, page.id, page.draft, 'save', label || null)
      return versionSummary({ ...row, created_at: new Date() }, page.published_version_id, row.id)
    })
    if (!result) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    return response.created({ version: result })
  }

  /**
   * Copies an old version into the draft. The current draft is saved as a
   * version first, so a restore can always be undone. The page address is kept.
   */
  async restore({ auth, params, response }: HttpContext) {
    const result = await db.transaction(async (trx) => {
      const page = await trx
        .from('pages')
        .where('user_id', auth.getUserOrFail().id)
        .forUpdate()
        .first()
      if (!page) return null
      const version = await trx
        .from('page_versions')
        .where({ page_id: page.id, number: Number(params.number) || 0 })
        .first()
      if (!version) return null
      await checkpoint(trx, page.id, page.draft, 'save', true)
      const draft = await draftValidator.validate({
        ...version.content,
        username: page.draft.username ?? '',
      })
      const revision = page.revision + 1
      await trx
        .from('pages')
        .where('id', page.id)
        .update({ draft: JSON.stringify(draft), revision, updated_at: new Date() })
      await addVersion(trx, page.id, draft, 'restore', `Restored version ${version.number}`)
      return { page: draft, revision }
    })
    if (!result) return response.notFound({ code: 'VERSION_NOT_FOUND' })
    return result
  }
}

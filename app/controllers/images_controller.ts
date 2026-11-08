import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'
import { unusedImages } from '#services/image_cleanup'
import db from '@adonisjs/lucid/services/db'
import CloudflareImages, { CloudflareImagesError } from '#services/cloudflare_images'
export default class ImagesController {
  async index({ auth, response }: HttpContext) {
    response.header('Cache-Control', 'no-store')
    return unusedImages(auth.getUserOrFail().id)
  }
  async cleanup({ auth }: HttpContext) {
    const result = await unusedImages(auth.getUserOrFail().id, true)
    return { ...result, queued: result.eligible }
  }
  private provider() {
    const account = env.get('CLOUDFLARE_ACCOUNT_ID')
    const token = env.get('CLOUDFLARE_IMAGES_TOKEN')
    return account && token ? new CloudflareImages(account, token.release()) : null
  }
  async store({ auth, response }: HttpContext) {
    const provider = this.provider()
    if (!provider) return response.serviceUnavailable({ code: 'IMAGES_NOT_CONFIGURED' })
    const userId = auth.getUserOrFail().id
    // Database-backed per-account quota also limits abandoned upload allocations.
    return db.transaction(async (trx) => {
      await trx.from('users').where('id', userId).forUpdate().firstOrFail()
      const count = await trx.from('images').where('user_id', userId).count('* as total').first()
      if (Number(count?.total) >= 50)
        return response.status(429).send({ code: 'IMAGE_QUOTA_REACHED' })
      try {
        const upload = await provider.createUpload(userId)
        await trx.table('images').insert({ id: upload.id, user_id: userId })
        response.header('Cache-Control', 'no-store')
        return response.created(upload)
      } catch (error) {
        if (error instanceof CloudflareImagesError)
          return response.badGateway({ code: 'IMAGE_PROVIDER_UNAVAILABLE' })
        throw error
      }
    })
  }
  /**
   * Copies a profile photo found by a page import into the account's images,
   * so published pages never load it from the old service. Only Linktree's
   * photo host is accepted: this must not become a general fetch proxy.
   */
  async importRemote({ auth, request, response }: HttpContext) {
    const url = String(request.input('url') ?? '')
    let parsed: URL | null = null
    try {
      parsed = new URL(url)
    } catch {}
    if (
      !parsed ||
      parsed.protocol !== 'https:' ||
      parsed.hostname !== 'ugc.production.linktr.ee' ||
      url.length > 2048
    )
      return response.unprocessableEntity({ code: 'INVALID_URL' })
    const provider = this.provider()
    if (!provider) return response.serviceUnavailable({ code: 'IMAGES_NOT_CONFIGURED' })
    const userId = auth.getUserOrFail().id
    const count = await db.from('images').where('user_id', userId).count('* as total').first()
    if (Number(count?.total) >= 50)
      return response.status(429).send({ code: 'IMAGE_QUOTA_REACHED' })
    try {
      const image = await provider.importFromUrl(parsed.href, userId)
      await db.table('images').insert({ id: image.id, user_id: userId, status: 'ready' })
      response.header('Cache-Control', 'no-store')
      return response.created(image)
    } catch (error) {
      if (error instanceof CloudflareImagesError)
        return response.badGateway({ code: 'IMAGE_PROVIDER_UNAVAILABLE' })
      throw error
    }
  }

  async confirm({ auth, params, response }: HttpContext) {
    const image = await db
      .from('images')
      .where('id', params.id)
      .where('user_id', auth.getUserOrFail().id)
      .first()
    if (!image) return response.notFound({ code: 'IMAGE_NOT_FOUND' })
    const provider = this.provider()
    if (!provider) return response.serviceUnavailable({ code: 'IMAGES_NOT_CONFIGURED' })
    try {
      const url = await provider.publicUrl(image.id)
      if (!url) return response.conflict({ code: 'IMAGE_UPLOAD_INCOMPLETE' })
      await db.from('images').where('id', image.id).update({ status: 'ready' })
      return { id: image.id, status: 'ready', url }
    } catch (error) {
      if (error instanceof CloudflareImagesError)
        return response.badGateway({ code: 'IMAGE_PROVIDER_UNAVAILABLE' })
      throw error
    }
  }
}

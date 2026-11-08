import db from '@adonisjs/lucid/services/db'
import env from '#start/env'
import CloudflareImages from '#services/cloudflare_images'

export const imageProviderOverride: { current: Pick<CloudflareImages, 'delete'> | null } = {
  current: null,
}
/** Keep anything referenced by a saved draft, live page, or retained history/test. */
export async function unusedImages(userId: number, queue = false) {
  return db.transaction(async (trx) => {
    if (!(await trx.from('users').where('id', userId).forUpdate().first()))
      return { total: 0, eligible: 0 }
    const images = await trx.from('images').where('user_id', userId)
    const page = await trx.from('pages').where('user_id', userId).first()
    const versions = page
      ? await trx.from('page_versions').where('page_id', page.id).select('content')
      : []
    const urls = [page?.draft, page?.published, ...versions.map((v) => v.content)]
      .map((content) => content?.avatarUrl)
      .filter((url): url is string => typeof url === 'string')
    const eligible = images.filter(
      (image) =>
        image.status !== 'deleting' &&
        new Date(image.created_at).getTime() < Date.now() - 86400000 &&
        !urls.some((url) => {
          try {
            return new URL(url).pathname.split('/').includes(image.id)
          } catch {
            return false
          }
        })
    )
    if (queue && eligible.length) {
      await trx
        .insertQuery()
        .table('image_deletions')
        .insert(eligible.map(({ id }) => ({ id, owner_id: userId })))
        .onConflict('id')
        .ignore()
      await trx
        .from('images')
        .whereIn(
          'id',
          eligible.map(({ id }) => id)
        )
        .update({ status: 'deleting' })
    }
    return { total: images.length, eligible: eligible.length }
  })
}

/** Durable queue survives account deletion and retries provider outages. */
export async function drainImageDeletions() {
  const account = env.get('CLOUDFLARE_ACCOUNT_ID')
  const token = env.get('CLOUDFLARE_IMAGES_TOKEN')
  const provider =
    imageProviderOverride.current ??
    (account && token ? new CloudflareImages(account, token.release()) : null)
  if (!provider) return
  for (let i = 0; i < 10; i++) {
    const candidate = await db.from('image_deletions').orderBy('created_at').first()
    if (!candidate) break
    const processed = await db.transaction(async (trx) => {
      // Same user-before-queue lock order as autosave and cleanup.
      if (candidate.owner_id)
        await trx.from('users').where('id', candidate.owner_id).forUpdate().first()
      const row = await trx
        .from('image_deletions')
        .where('id', candidate.id)
        .forUpdate()
        .skipLocked()
        .first()
      if (!row) return true
      if (row.owner_id) {
        const page = await trx.from('pages').where('user_id', row.owner_id).first()
        const versions = page
          ? await trx.from('page_versions').where('page_id', page.id).select('content')
          : []
        const referenced = [page?.draft, page?.published, ...versions.map((v) => v.content)].some(
          (content) => {
            try {
              return new URL(content?.avatarUrl).pathname.split('/').includes(row.id)
            } catch {
              return false
            }
          }
        )
        if (referenced) {
          await trx.from('images').where('id', row.id).update({ status: 'ready' })
          await trx.from('image_deletions').where('id', row.id).delete()
          return true
        }
      }
      await provider.delete(row.id)
      await trx.from('images').where('id', row.id).delete()
      await trx.from('image_deletions').where('id', row.id).delete()
      return true
    })
    if (!processed) break
  }
}

export async function cleanUnusedImages() {
  const owners = await db
    .from('images')
    .where('created_at', '<', new Date(Date.now() - 86400000))
    .distinct('user_id')
  for (const owner of owners) await unusedImages(owner.user_id, true)
  await db.from('email_changes').where('expires_at', '<', new Date()).delete()
}

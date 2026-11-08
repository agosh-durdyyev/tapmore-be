import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { activityCutoff, activityDays, purgeOldActivity } from '#services/activity_retention'
import { countryFor } from '#services/geo'

const eventValidator = vine.create({
  eventId: vine.string().uuid(),
  type: vine.enum(['view', 'click']),
  linkId: vine.string().maxLength(100).optional(),
})

export default class ActivityController {
  async store({ params, request, response }: HttpContext) {
    const event = await request.validateUsing(eventValidator)
    const page = await db
      .from('pages')
      .where('username', String(params.username).toLowerCase())
      .whereNotNull('published')
      .first()
    if (!page) return response.notFound({ code: 'PAGE_NOT_FOUND' })
    const link =
      event.type === 'click'
        ? page.published.links.find(
            (value: { id: string; visible: boolean }) => value.id === event.linkId && value.visible
          )
        : null
    if (event.type === 'click' && !link)
      return response.unprocessableEntity({ code: 'LINK_NOT_FOUND' })
    const ip = request.ip()
    await db
      .table('page_events')
      .insert({
        event_id: event.eventId,
        page_id: page.id,
        kind: event.type,
        ip,
        country: await countryFor(ip),
        link_id: link?.id ?? null,
        link_title: link?.title ?? null,
      })
      .onConflict('event_id')
      .ignore()
    response.header('Cache-Control', 'no-store')
    return response.noContent()
  }

  async show({ auth, response }: HttpContext) {
    const page = await db.from('pages').where('user_id', auth.getUserOrFail().id).first()
    response.header('Cache-Control', 'no-store')
    const empty = {
      periodDays: activityDays,
      views: 0,
      clicks: 0,
      uniqueIps: 0,
      links: [],
      events: [],
    }
    if (!page) return empty
    await purgeOldActivity()
    const query = () =>
      db.from('page_events').where('page_id', page.id).where('created_at', '>=', activityCutoff())
    const totals = await query()
      .select(
        db.raw(
          "count(*) filter (where kind = 'view') as views, count(*) filter (where kind = 'click') as clicks, count(distinct ip) as unique_ips"
        )
      )
      .first()
    const links = await query()
      .where('kind', 'click')
      .groupBy('link_id')
      .select('link_id')
      .count('* as clicks')
    const events = await query()
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(50)
      .select('id', 'kind', 'ip', 'country', 'link_id', 'link_title', 'created_at')
    return {
      periodDays: activityDays,
      views: Number(totals.views),
      clicks: Number(totals.clicks),
      uniqueIps: Number(totals.unique_ips),
      links: links.map((row) => ({ id: row.link_id, clicks: Number(row.clicks) })),
      events: await Promise.all(
        events.map(async (row) => ({
          id: String(row.id),
          type: row.kind,
          ip: row.ip,
          // Rows recorded before the GeoIP database existed have no country; look it up now.
          country: row.country ?? (row.ip ? await countryFor(row.ip) : null),
          linkId: row.link_id,
          title: row.link_title,
          at: new Date(row.created_at).toISOString(),
        }))
      ),
    }
  }
}

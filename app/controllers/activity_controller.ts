import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { activityCutoff, activityDays, purgeOldActivity } from '#services/activity_retention'
import { countryFor } from '#services/geo'

const eventValidator = vine.create({
  eventId: vine.string().uuid(),
  type: vine.enum(['view', 'click']),
  linkId: vine.string().maxLength(100).optional(),
  /** Set when the visitor was shown a variant of an A/B test. */
  variantId: vine.number().withoutDecimals().min(1).optional(),
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
    // A variant must belong to this page; its links, not the live page's, were shown.
    const variant = event.variantId
      ? await db
          .from('experiment_variants as v')
          .join('experiments as e', 'e.id', 'v.experiment_id')
          .join('page_versions as p', 'p.id', 'v.version_id')
          .where('v.id', event.variantId)
          .where('e.page_id', page.id)
          .select('v.id', 'p.content')
          .first()
      : null
    if (event.variantId && !variant)
      return response.unprocessableEntity({ code: 'VARIANT_NOT_FOUND' })
    const shown = variant ? variant.content : page.published
    const link =
      event.type === 'click'
        ? shown.links.find(
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
        variant_id: variant?.id ?? null,
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

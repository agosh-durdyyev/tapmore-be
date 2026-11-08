import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { contentIssues } from '#services/content_policy'

const startValidator = vine.create({
  name: vine.string().trim().minLength(1).maxLength(80),
  variants: vine
    .array(
      vine.object({
        label: vine.string().trim().minLength(1).maxLength(40),
        version: vine.number().withoutDecimals().min(1),
        weight: vine.number().withoutDecimals().min(1).max(99),
      })
    )
    .minLength(2)
    .maxLength(4),
})

const stopValidator = vine.create({
  /** Version number to make live when the test ends, usually the winner. */
  publishVersion: vine.number().withoutDecimals().min(1).optional(),
})

/**
 * A/B tests: split public visits between saved versions of the page and
 * compare visits and clicks per variant. One running test per page.
 */
export default class ExperimentsController {
  /** The running test, or the most recent one, with per-variant results. */
  async show({ auth, response }: HttpContext) {
    const page = await db.from('pages').where('user_id', auth.getUserOrFail().id).first()
    response.header('Cache-Control', 'no-store')
    if (!page) return { experiment: null }
    const experiment = await db
      .from('experiments')
      .where('page_id', page.id)
      .orderByRaw("status = 'running' desc")
      .orderBy('started_at', 'desc')
      .first()
    return { experiment: experiment ? await describe(experiment) : null }
  }

  async store({ auth, request, response }: HttpContext) {
    const input = await request.validateUsing(startValidator)
    if (input.variants.reduce((sum, variant) => sum + variant.weight, 0) !== 100)
      return response.unprocessableEntity({ code: 'WEIGHTS_MUST_TOTAL_100' })
    if (new Set(input.variants.map((variant) => variant.version)).size !== input.variants.length)
      return response.unprocessableEntity({ code: 'DUPLICATE_VERSION' })
    const result = await db.transaction(async (trx) => {
      const page = await trx
        .from('pages')
        .where('user_id', auth.getUserOrFail().id)
        .forUpdate()
        .first()
      if (!page) return { error: 'PAGE_NOT_FOUND', status: 404 }
      if (!page.published) return { error: 'NOT_PUBLISHED', status: 409 }
      const running = await trx.from('experiments').where({ page_id: page.id, status: 'running' })
      if (running.length) return { error: 'EXPERIMENT_RUNNING', status: 409 }
      const versions = await trx
        .from('page_versions')
        .where('page_id', page.id)
        .whereIn(
          'number',
          input.variants.map((variant) => variant.version)
        )
      if (versions.length !== input.variants.length)
        return { error: 'VERSION_NOT_FOUND', status: 404 }
      // Every variant is shown publicly, so each must pass the same checks as publishing.
      if (versions.some((version) => contentIssues(version.content).length))
        return { error: 'CONTENT_NOT_ALLOWED', status: 422 }
      const [experiment] = await trx
        .table('experiments')
        .insert({ page_id: page.id, name: input.name, status: 'running' })
        .returning('*')
      await trx.table('experiment_variants').multiInsert(
        input.variants.map((variant) => ({
          experiment_id: experiment.id,
          version_id: versions.find((version) => version.number === variant.version)!.id,
          label: variant.label,
          weight: variant.weight,
        }))
      )
      return { experiment }
    })
    if ('error' in result) return response.status(result.status ?? 400).send({ code: result.error })
    return response.created({ experiment: await describe(result.experiment) })
  }

  /** Ends the running test; optionally makes one variant's version live. */
  async stop({ auth, request, response }: HttpContext) {
    const { publishVersion } = await request.validateUsing(stopValidator)
    const result = await db.transaction(async (trx) => {
      const page = await trx
        .from('pages')
        .where('user_id', auth.getUserOrFail().id)
        .forUpdate()
        .first()
      if (!page) return null
      const experiment = await trx
        .from('experiments')
        .where({ page_id: page.id, status: 'running' })
        .first()
      if (!experiment) return null
      if (publishVersion !== undefined) {
        const winner = await trx
          .from('experiment_variants as v')
          .join('page_versions as p', 'p.id', 'v.version_id')
          .where('v.experiment_id', experiment.id)
          .where('p.number', publishVersion)
          .select('p.id', 'p.content')
          .first()
        if (!winner) return { error: 'VERSION_NOT_IN_TEST' }
        await trx
          .from('pages')
          .where('id', page.id)
          .update({
            published: JSON.stringify({ ...winner.content, username: page.username }),
            published_version_id: winner.id,
            published_at: new Date(),
          })
      }
      const [stopped] = await trx
        .from('experiments')
        .where('id', experiment.id)
        .update({ status: 'stopped', ended_at: new Date() })
        .returning('*')
      return { experiment: stopped }
    })
    if (!result) return response.notFound({ code: 'EXPERIMENT_NOT_FOUND' })
    if ('error' in result) return response.unprocessableEntity({ code: result.error })
    return { experiment: await describe(result.experiment) }
  }
}

async function describe(experiment: {
  id: number
  name: string
  status: string
  started_at: Date | string
  ended_at: Date | string | null
}) {
  const variants = await db
    .from('experiment_variants as v')
    .join('page_versions as p', 'p.id', 'v.version_id')
    .where('v.experiment_id', experiment.id)
    .orderBy('v.id')
    .select('v.id', 'v.label', 'v.weight', 'p.number')
  const counts = await db
    .from('page_events')
    .whereIn(
      'variant_id',
      variants.map((variant) => variant.id)
    )
    .groupBy('variant_id')
    .select(
      'variant_id',
      db.raw(
        "count(*) filter (where kind = 'view') as views, count(*) filter (where kind = 'click') as clicks"
      )
    )
  return {
    id: experiment.id,
    name: experiment.name,
    status: experiment.status as 'running' | 'stopped',
    startedAt: new Date(experiment.started_at).toISOString(),
    endedAt: experiment.ended_at ? new Date(experiment.ended_at).toISOString() : null,
    variants: variants.map((variant) => {
      const count = counts.find((row) => row.variant_id === variant.id)
      return {
        id: variant.id,
        label: variant.label,
        version: variant.number,
        weight: variant.weight,
        views: Number(count?.views ?? 0),
        clicks: Number(count?.clicks ?? 0),
      }
    }),
  }
}

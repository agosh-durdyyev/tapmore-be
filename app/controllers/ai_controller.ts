import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import env from '#start/env'
import { textIssue } from '#services/content_policy'
import { hit } from '#services/rate_limit'
import {
  AiError,
  aiAvailable,
  importPage,
  safeLinkUrl,
  suggestBios,
  suggestTitles,
  templateIds,
} from '#services/ai'
import { LinktreeError, importLinktree, linktreeUsername } from '#services/linktree_import'

const importValidator = vine.create({ url: vine.string().trim().maxLength(2048) })
const suggestValidator = vine.create({
  kind: vine.enum(['title', 'bio']),
  url: vine.string().trim().maxLength(2048).optional(),
  current: vine.string().trim().maxLength(500).optional(),
  name: vine.string().trim().maxLength(100).optional(),
  field: vine.enum([...templateIds]).optional(),
  links: vine.array(vine.string().trim().maxLength(160)).maxLength(30).optional(),
})

/** Per-kind hourly limits: [signed in per account, signed out per IP]. */
const hourly = { import: [10, 3], suggest: [60, 15] } as const

/**
 * Import an existing page and suggest titles or bios. Every model call costs
 * money, so each request passes validation, a content check, a per-IP burst
 * limit, an hourly per-account (or stricter per-IP) limit, and daily caps
 * across all users and across signed-out users before reaching the model.
 */
export default class AiController {
  async import(ctx: HttpContext) {
    const { url } = await ctx.request.validateUsing(importValidator)
    // Linktree pages are read directly: exact, instant, and no model cost.
    const linktree = linktreeUsername(url)
    if (linktree) return direct(ctx, () => importLinktree(linktree).then((page) => ({ page })))
    const source = safeLinkUrl(/^https?:\/\//i.test(url) ? url : `https://${url}`)
    if (!source || source.startsWith('mailto:') || isPrivateHost(source))
      return ctx.response.unprocessableEntity({ code: 'INVALID_URL' })
    return run(ctx, 'import', () => importPage(source).then((page) => ({ page })))
  }

  async suggest(ctx: HttpContext) {
    const input = await ctx.request.validateUsing(suggestValidator)
    const texts = [input.current, input.name, ...(input.links ?? [])].filter(Boolean) as string[]
    if (texts.some((text) => textIssue(text, 'text')))
      return ctx.response.unprocessableEntity({ code: 'CONTENT_NOT_ALLOWED' })
    if (input.kind === 'title') {
      const url = input.url ? safeLinkUrl(input.url) : null
      if (!url) return ctx.response.unprocessableEntity({ code: 'INVALID_URL' })
      return run(ctx, 'suggest', () =>
        suggestTitles({ url, current: input.current ?? '', name: input.name ?? '' }).then(
          (options) => ({ options })
        )
      )
    }
    if (!input.name && !input.links?.length)
      return ctx.response.unprocessableEntity({ code: 'NOT_ENOUGH_CONTEXT' })
    return run(ctx, 'suggest', () =>
      suggestBios({
        name: input.name ?? '',
        field: input.field ?? 'other',
        current: input.current ?? '',
        links: input.links ?? [],
      }).then((options) => ({ options }))
    )
  }
}

async function run(
  { auth, request, response }: HttpContext,
  kind: keyof typeof hourly,
  call: () => Promise<object>
) {
  response.header('Cache-Control', 'no-store')
  if (!aiAvailable()) return response.serviceUnavailable({ code: 'AI_NOT_CONFIGURED' })
  const user = auth.user
  const ip = request.ip()
  const [signedIn, signedOut] = hourly[kind]
  const day = new Date().toISOString().slice(0, 10)
  const checks: [string, string, number, number][] = [
    ['ai-burst', ip, 5, 60],
    user
      ? [`ai-${kind}`, `user:${user.id}`, signedIn, 3600]
      : [`ai-${kind}`, `ip:${ip}`, signedOut, 3600],
    ...(user
      ? []
      : ([['ai-anon-day', day, env.get('AI_ANON_DAILY_LIMIT') ?? 500, 86400]] as [
          string,
          string,
          number,
          number,
        ][])),
    ['ai-day', day, env.get('AI_DAILY_LIMIT') ?? 2000, 86400],
  ]
  for (const [bucket, subject, limit, windowSeconds] of checks) {
    const result = await hit(bucket, subject, limit, windowSeconds)
    if (!result.ok) {
      response.header('Retry-After', String(result.retryAfter))
      return response.status(429).send({
        code: bucket.endsWith('day') ? 'AI_BUSY' : 'RATE_LIMITED',
        signInForMore: !user && bucket === `ai-${kind}`,
      })
    }
  }
  try {
    return await call()
  } catch (error) {
    if (error instanceof AiError) return response.status(error.status).send({ code: error.code })
    throw error
  }
}

/** Imports that skip the model still fetch another site, so they are rate limited too. */
async function direct({ auth, request, response }: HttpContext, call: () => Promise<object>) {
  response.header('Cache-Control', 'no-store')
  const subject = auth.user ? `user:${auth.user.id}` : `ip:${request.ip()}`
  const result = await hit('import-direct', subject, auth.user ? 30 : 10, 3600)
  if (!result.ok) {
    response.header('Retry-After', String(result.retryAfter))
    return response.status(429).send({ code: 'RATE_LIMITED', signInForMore: !auth.user })
  }
  try {
    return await call()
  } catch (error) {
    if (error instanceof LinktreeError)
      return response.status(error.status).send({ code: error.code })
    throw error
  }
}

/** Never ask to import local or private-network addresses. */
function isPrivateHost(url: string) {
  const host = new URL(url).hostname.toLowerCase().replace(/^\[|\]$/g, '')
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host === '::1' ||
    /^f[cd][0-9a-f]{2}:/.test(host)
  )
}

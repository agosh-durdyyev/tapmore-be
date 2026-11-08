import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { hit } from '#services/rate_limit'

/**
 * Per-IP request limits for the API. Stricter buckets for sign-in and for
 * public visit/click events (so a script can't inflate someone's stats).
 * AI endpoints add their own per-account and daily limits in AiController.
 */
export default class RateLimitMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const url = request.url()
    if (!url.startsWith('/api/')) return next()
    const ip = request.ip()
    const checks: [string, string, number, number][] = [
      url.startsWith('/api/v1/auth/') ? ['auth', ip, 10, 60] : ['api', ip, 120, 60],
    ]
    const events = /^\/api\/v1\/public\/pages\/([^/]+)\/events$/.exec(url)
    if (events) checks.push(['events', `${ip}:${events[1].toLowerCase()}`, 30, 60])
    for (const [bucket, subject, limit, windowSeconds] of checks) {
      const result = await hit(bucket, subject, limit, windowSeconds)
      if (!result.ok) {
        response.header('Retry-After', String(result.retryAfter))
        return response.status(429).send({ code: 'RATE_LIMITED' })
      }
    }
    return next()
  }
}

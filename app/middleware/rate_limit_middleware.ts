import { createHash } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import db from '@adonisjs/lucid/services/db'

export default class RateLimitMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    if (!request.url().startsWith('/api/')) return next()
    const isAuth = request.url().startsWith('/api/v1/auth/')
    const limit = isAuth ? 10 : 120
    const key = createHash('sha256')
      .update(`${isAuth ? 'auth' : 'api'}:${request.ip()}`)
      .digest('hex')
    const result = await db.rawQuery(
      `
      INSERT INTO rate_limits (key, attempts, expires_at)
      VALUES (?, 1, CURRENT_TIMESTAMP + INTERVAL '1 minute')
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN rate_limits.expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE rate_limits.attempts + 1 END,
        expires_at = CASE WHEN rate_limits.expires_at <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + INTERVAL '1 minute' ELSE rate_limits.expires_at END
      RETURNING attempts
    `,
      [key]
    )
    if (Number(result.rows[0].attempts) > limit) {
      response.header('Retry-After', '60')
      return response.status(429).send({ code: 'RATE_LIMITED' })
    }
    return next()
  }
}

import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'

/**
 * Fixed-window counters in Postgres. Shared by every server replica, so limits
 * hold behind Railway's load balancer. Subjects (IPs, user ids) are hashed.
 */
export async function hit(bucket: string, subject: string, limit: number, windowSeconds: number) {
  const key = createHash('sha256').update(`${bucket}:${subject}`).digest('hex')
  const result = await db.rawQuery(
    `
    INSERT INTO rate_limits (key, attempts, expires_at)
    VALUES (?, 1, CURRENT_TIMESTAMP + make_interval(secs => ?::double precision))
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE WHEN rate_limits.expires_at <= CURRENT_TIMESTAMP THEN 1 ELSE rate_limits.attempts + 1 END,
      expires_at = CASE WHEN rate_limits.expires_at <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + make_interval(secs => ?::double precision) ELSE rate_limits.expires_at END
    RETURNING attempts, CEIL(EXTRACT(EPOCH FROM (expires_at - CURRENT_TIMESTAMP)))::int AS retry_after
  `,
    [key, windowSeconds, windowSeconds]
  )
  const row = result.rows[0]
  // Occasionally clear expired counters so the table stays small.
  if (Math.random() < 0.01)
    await db.from('rate_limits').where('expires_at', '<', new Date()).delete()
  return {
    ok: Number(row.attempts) <= limit,
    retryAfter: Math.max(1, Number(row.retry_after) || windowSeconds),
  }
}

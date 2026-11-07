import { isIP } from 'node:net'

/** Railway's edge replaces X-Real-IP; ignore that header outside Railway. */
export function clientIp(fallback: string, realIp: string | undefined, railway: boolean) {
  const candidate = railway && realIp && isIP(realIp) ? realIp : fallback
  return candidate.startsWith('::ffff:') && isIP(candidate.slice(7)) === 4
    ? candidate.slice(7)
    : candidate
}

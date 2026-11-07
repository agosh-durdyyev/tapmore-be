import { createPublicKey, verify, type JsonWebKeyInput } from 'node:crypto'

export class IdTokenError extends Error {}

export interface VerifiedIdentity {
  provider: 'google' | 'apple'
  subject: string
  email: string
  emailVerified: boolean
}

interface ProviderConfig {
  provider: VerifiedIdentity['provider']
  jwksUrl: string
  issuers: string[]
}

export const providers: Record<VerifiedIdentity['provider'], ProviderConfig> = {
  google: {
    provider: 'google',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
  },
  apple: {
    provider: 'apple',
    jwksUrl: 'https://appleid.apple.com/auth/keys',
    issuers: ['https://appleid.apple.com'],
  },
}

type Jwk = JsonWebKeyInput['key'] & { kid?: string }

function decodeSegment(segment: string) {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
  } catch {
    throw new IdTokenError('Malformed token')
  }
}

/**
 * Verifies OpenID Connect ID tokens from Google Identity Services and
 * Sign in with Apple (popup mode). Both are RS256 JWTs signed by keys the
 * provider publishes as a JWKS, so no OAuth redirect flow is needed: the
 * browser keeps the user's draft in place and only sends us the token.
 */
export default class IdTokenVerifier {
  private cache = new Map<string, { keys: Jwk[]; expires: number }>()

  constructor(
    private audiences: Partial<Record<VerifiedIdentity['provider'], string[]>>,
    private transport: typeof fetch = fetch,
    private now: () => number = Date.now
  ) {}

  private async keys(config: ProviderConfig, forceRefresh = false) {
    const cached = this.cache.get(config.jwksUrl)
    if (cached && !forceRefresh && cached.expires > this.now()) return cached.keys
    let response: Response
    try {
      response = await this.transport(config.jwksUrl, { signal: AbortSignal.timeout(5000) })
    } catch {
      throw new IdTokenError('Identity provider unavailable')
    }
    const data = (await response.json().catch(() => null)) as { keys?: Jwk[] } | null
    if (!response.ok || !Array.isArray(data?.keys))
      throw new IdTokenError('Identity provider returned no keys')
    this.cache.set(config.jwksUrl, { keys: data.keys, expires: this.now() + 60 * 60 * 1000 })
    return data.keys
  }

  async verify(
    provider: VerifiedIdentity['provider'],
    token: string,
    expectedNonce?: string
  ): Promise<VerifiedIdentity> {
    const config = providers[provider]
    const audiences = this.audiences[provider] ?? []
    if (!audiences.length) throw new IdTokenError(`${provider} sign-in is not configured`)

    const parts = token.split('.')
    if (parts.length !== 3) throw new IdTokenError('Malformed token')
    const [rawHeader, rawPayload, rawSignature] = parts
    const header = decodeSegment(rawHeader)
    if (header.alg !== 'RS256' || typeof header.kid !== 'string')
      throw new IdTokenError('Unsupported token algorithm')

    // Providers rotate keys; refetch once if the kid is new to us.
    const cached = await this.keys(config)
    let jwk = cached.find((key) => key.kid === header.kid)
    if (!jwk) {
      const refreshed = await this.keys(config, true)
      jwk = refreshed.find((key) => key.kid === header.kid)
    }
    if (!jwk) throw new IdTokenError('Unknown signing key')

    const valid = verify(
      'RSA-SHA256',
      Buffer.from(`${rawHeader}.${rawPayload}`),
      createPublicKey({ key: jwk, format: 'jwk' }),
      Buffer.from(rawSignature, 'base64url')
    )
    if (!valid) throw new IdTokenError('Invalid signature')

    const claims = decodeSegment(rawPayload)
    const nowSeconds = Math.floor(this.now() / 1000)
    if (!config.issuers.includes(claims.iss)) throw new IdTokenError('Wrong issuer')
    const tokenAudiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (!tokenAudiences.some((aud: string) => audiences.includes(aud)))
      throw new IdTokenError('Wrong audience')
    if (typeof claims.exp !== 'number' || claims.exp < nowSeconds - 60)
      throw new IdTokenError('Token expired')
    if (typeof claims.iat === 'number' && claims.iat > nowSeconds + 300)
      throw new IdTokenError('Token issued in the future')
    if (expectedNonce !== undefined && claims.nonce !== expectedNonce)
      throw new IdTokenError('Nonce mismatch')
    if (typeof claims.sub !== 'string' || !claims.sub) throw new IdTokenError('Missing subject')
    if (typeof claims.email !== 'string' || !claims.email)
      throw new IdTokenError('The account did not share an email address')

    // Apple sends booleans as strings ("true").
    const emailVerified = claims.email_verified === true || claims.email_verified === 'true'
    return {
      provider,
      subject: claims.sub,
      email: claims.email.trim().toLowerCase(),
      emailVerified,
    }
  }
}

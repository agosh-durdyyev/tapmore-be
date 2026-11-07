import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import env from '#start/env'
import User from '#models/user'
import UserTransformer from '#transformers/user_transformer'
import IdTokenVerifier, { IdTokenError, type VerifiedIdentity } from '#services/id_token_verifier'
import { LogMailer, MailerError, ResendMailer, type Mailer } from '#services/mailer'

const CODE_TTL_MS = 10 * 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const SESSION_LENGTH = '90 days'

const email = () => vine.string().trim().toLowerCase().email().maxLength(254)
const name = () => vine.string().trim().maxLength(100).optional()

const googleValidator = vine.create({ credential: vine.string().maxLength(4096) })
const appleValidator = vine.create({
  idToken: vine.string().maxLength(4096),
  nonce: vine.string().maxLength(128).optional(),
  // Apple shares the name only on the very first sign-in, from the browser.
  fullName: name(),
})
const codeRequestValidator = vine.create({ email: email() })
const codeVerifyValidator = vine.create({
  email: email(),
  code: vine.string().trim().regex(/^\d{6}$/),
  fullName: name(),
})

const csv = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

let verifier: IdTokenVerifier | undefined
function idTokens() {
  verifier ??= new IdTokenVerifier({
    google: csv(env.get('GOOGLE_CLIENT_IDS')),
    apple: csv(env.get('APPLE_CLIENT_IDS')),
  })
  return verifier
}

/** Tests swap in a mailer that captures codes instead of sending them. */
export const mailerOverride: { current: Mailer | null } = { current: null }

function mailer(): Mailer {
  if (mailerOverride.current) return mailerOverride.current
  const key = env.get('RESEND_API_KEY')?.release()
  if (key) return new ResendMailer(key, env.get('MAIL_FROM', 'TapMore <hello@tapmore.link>'))
  if (env.get('NODE_ENV') === 'production') throw new MailerError('Email is not configured')
  return new LogMailer()
}

function hashCode(address: string, code: string) {
  return createHmac('sha256', env.get('APP_KEY').release()).update(`${address}:${code}`).digest('hex')
}

/**
 * Finds the account for a verified email, creating it on first sign-in.
 * Google, Apple and email codes all land on the same account when they share
 * a verified email, so people never end up with duplicate pages.
 */
async function accountFor(address: string, fullName?: string, identity?: VerifiedIdentity) {
  return db.transaction(async (trx) => {
    let user = identity
      ? await trx
          .from('auth_identities')
          .where({ provider: identity.provider, subject: identity.subject })
          .first()
          .then((row) => (row ? User.find(row.user_id, { client: trx }) : null))
      : null
    user ??= await User.findBy('email', address, { client: trx })
    if (!user) {
      user = new User()
      user.useTransaction(trx)
      user.merge({ email: address, fullName: fullName || null })
      await user.save()
    } else if (!user.fullName && fullName) {
      user.useTransaction(trx)
      user.fullName = fullName
      await user.save()
    }
    if (identity) {
      await trx
        .insertQuery()
        .table('auth_identities')
        .insert({ user_id: user.id, provider: identity.provider, subject: identity.subject })
        .onConflict(['provider', 'subject'])
        .ignore()
    }
    return user
  })
}

async function session(user: User, isNew: boolean) {
  const token = await User.accessTokens.create(user, ['*'], { expiresIn: SESSION_LENGTH })
  return {
    user: UserTransformer.transform(user),
    token: token.value!.release(),
    isNew,
  }
}

export default class PasswordlessController {
  async google({ request, response, serialize }: HttpContext) {
    const { credential } = await request.validateUsing(googleValidator)
    return this.withIdentity('google', credential, undefined, undefined, response, serialize)
  }

  async apple({ request, response, serialize }: HttpContext) {
    const { idToken, nonce, fullName } = await request.validateUsing(appleValidator)
    return this.withIdentity('apple', idToken, nonce, fullName, response, serialize)
  }

  private async withIdentity(
    provider: VerifiedIdentity['provider'],
    token: string,
    nonce: string | undefined,
    fullName: string | undefined,
    response: HttpContext['response'],
    serialize: HttpContext['serialize']
  ) {
    let identity: VerifiedIdentity
    try {
      identity = await idTokens().verify(provider, token, nonce)
    } catch (error) {
      if (error instanceof IdTokenError)
        return response.unauthorized({ code: 'INVALID_IDENTITY', message: error.message })
      throw error
    }
    // An unverified email could belong to someone else's TapMore account.
    if (!identity.emailVerified)
      return response.unauthorized({ code: 'EMAIL_NOT_VERIFIED' })
    const existed = await User.findBy('email', identity.email)
    const user = await accountFor(identity.email, fullName, identity)
    return serialize(await session(user, !existed))
  }

  async requestCode({ request, response }: HttpContext) {
    const { email: address } = await request.validateUsing(codeRequestValidator)
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await db.transaction(async (trx) => {
      // Only the newest code works; older ones stop being valid immediately.
      await trx
        .from('login_codes')
        .where('email', address)
        .whereNull('consumed_at')
        .update({ consumed_at: new Date() })
      await trx.table('login_codes').insert({
        email: address,
        code_hash: hashCode(address, code),
        expires_at: new Date(Date.now() + CODE_TTL_MS),
      })
    })
    try {
      await mailer().sendLoginCode(address, code)
    } catch (error) {
      if (error instanceof MailerError) return response.serviceUnavailable({ code: 'EMAIL_UNAVAILABLE' })
      throw error
    }
    // Same answer whether or not an account exists, so emails can't be probed.
    return response.accepted({ sent: true, expiresInSeconds: CODE_TTL_MS / 1000 })
  }

  async verifyCode({ request, response, serialize }: HttpContext) {
    const { email: address, code, fullName } = await request.validateUsing(codeVerifyValidator)
    const outcome = await db.transaction(async (trx) => {
      const row = await trx
        .from('login_codes')
        .where('email', address)
        .whereNull('consumed_at')
        .where('expires_at', '>', new Date())
        .orderBy('id', 'desc')
        .forUpdate()
        .first()
      if (!row) return 'EXPIRED' as const
      if (row.attempts >= MAX_CODE_ATTEMPTS) return 'TOO_MANY_ATTEMPTS' as const
      const expected = Buffer.from(row.code_hash, 'hex')
      const actual = Buffer.from(hashCode(address, code), 'hex')
      if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        await trx.from('login_codes').where('id', row.id).increment('attempts', 1)
        return 'WRONG_CODE' as const
      }
      await trx.from('login_codes').where('id', row.id).update({ consumed_at: new Date() })
      return 'OK' as const
    })
    if (outcome !== 'OK') return response.unauthorized({ code: outcome })
    const existed = await User.findBy('email', address)
    const user = await accountFor(address, fullName)
    return serialize(await session(user, !existed))
  }
}

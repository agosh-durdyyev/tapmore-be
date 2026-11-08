import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import env from '#start/env'
import { mailer } from '#controllers/passwordless_controller'
import { MailerError } from '#services/mailer'
import { hit } from '#services/rate_limit'

const emailValidator = vine.create({
  email: vine.string().trim().toLowerCase().email().maxLength(254),
})
const verifyValidator = vine.create({
  code: vine
    .string()
    .trim()
    .regex(/^\d{6}$/),
})
function digest(id: number, email: string, code: string) {
  return createHmac('sha256', env.get('APP_KEY').release())
    .update(`email-change:${id}:${email}:${code}`)
    .digest('hex')
}
export default class AccountSettingsController {
  async requestEmail({ auth, request, response }: HttpContext) {
    const { email } = await request.validateUsing(emailValidator)
    const user = auth.getUserOrFail()
    const limit = await hit('email-change', String(user.id), 5, 3600)
    if (!limit.ok) {
      response.header('Retry-After', String(limit.retryAfter))
      return response.tooManyRequests({ code: 'RATE_LIMITED' })
    }
    if (email === user.email) return response.conflict({ code: 'EMAIL_UNCHANGED' })
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    await db.transaction(async (trx) => {
      await trx.from('users').where('id', user.id).forUpdate().firstOrFail()
      await trx.from('email_changes').where('user_id', user.id).delete()
      await trx.table('email_changes').insert({
        user_id: user.id,
        email,
        code_hash: digest(user.id, email, code),
        expires_at: new Date(Date.now() + 600000),
      })
    })
    try {
      await mailer().sendLoginCode(email, code, 'email-change')
    } catch (error) {
      if (error instanceof MailerError)
        return response.serviceUnavailable({ code: 'EMAIL_UNAVAILABLE' })
      throw error
    }
    return response.accepted({ sent: true })
  }
  async verifyEmail({ auth, request, response }: HttpContext) {
    const { code } = await request.validateUsing(verifyValidator)
    const user = auth.getUserOrFail()
    let outcome: string
    try {
      outcome = await db.transaction(async (trx) => {
        await trx.from('users').where('id', user.id).forUpdate().firstOrFail()
        const row = await trx.from('email_changes').where('user_id', user.id).forUpdate().first()
        if (!row || new Date(row.expires_at).getTime() <= Date.now()) return 'EXPIRED'
        if (row.attempts >= 5) return 'TOO_MANY_ATTEMPTS'
        if (
          !timingSafeEqual(
            Buffer.from(row.code_hash, 'hex'),
            Buffer.from(digest(user.id, row.email, code), 'hex')
          )
        ) {
          await trx.from('email_changes').where('user_id', user.id).increment('attempts', 1)
          return 'WRONG_CODE'
        }
        if (await trx.from('users').where('email', row.email).whereNot('id', user.id).first())
          return 'EMAIL_IN_USE'
        await trx
          .from('users')
          .where('id', user.id)
          .update({ email: row.email, updated_at: new Date() })
        // Old provider identities must not retain access after changing the sign-in address.
        await trx.from('auth_identities').where('user_id', user.id).delete()
        await trx.from('auth_access_tokens').where('tokenable_id', user.id).delete()
        await trx.from('login_codes').whereIn('email', [user.email, row.email]).delete()
        await trx.from('email_changes').where('user_id', user.id).delete()
        return 'OK'
      })
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505')
        return response.conflict({ code: 'EMAIL_IN_USE' })
      throw error
    }
    if (outcome !== 'OK')
      return response.status(outcome === 'EMAIL_IN_USE' ? 409 : 422).send({ code: outcome })
    return response.noContent()
  }
  async logoutAll({ auth, response }: HttpContext) {
    await db.from('auth_access_tokens').where('tokenable_id', auth.getUserOrFail().id).delete()
    return response.noContent()
  }
  async destroy({ auth, request, response }: HttpContext) {
    const { email } = await request.validateUsing(emailValidator)
    const user = auth.getUserOrFail()
    if (email !== user.email)
      return response.unprocessableEntity({ code: 'EMAIL_CONFIRMATION_REQUIRED' })
    await db.transaction(async (trx) => {
      await trx.from('users').where('id', user.id).forUpdate().firstOrFail()
      const images = await trx.from('images').where('user_id', user.id).select('id')
      if (images.length)
        await trx.insertQuery().table('image_deletions').insert(images).onConflict('id').ignore()
      await trx.from('login_codes').where('email', user.email).delete()
      await trx.from('users').where('id', user.id).delete()
    })
    return response.noContent()
  }
}

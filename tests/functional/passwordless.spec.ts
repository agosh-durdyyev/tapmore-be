import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { mailerOverride } from '#controllers/passwordless_controller'

const inbox = new Map<string, string>()

test.group('Passwordless email codes', (group) => {
  group.setup(() => {
    mailerOverride.current = { sendLoginCode: async (email, code) => void inbox.set(email, code) }
    return () => {
      mailerOverride.current = null
    }
  })
  group.each.setup(async () => {
    inbox.clear()
    await db.from('rate_limits').delete()
    await db.from('login_codes').delete()
    await db.from('auth_identities').delete()
    await db.from('pages').delete()
    await User.query().delete()
  })

  test('creates an account from a code, with no password', async ({ client, assert }) => {
    const sent = await client.post('/api/v1/auth/email/code').json({ email: 'Maya@Example.com ' })
    sent.assertStatus(202)
    const code = inbox.get('maya@example.com')!
    assert.match(code, /^\d{6}$/)

    const verified = await client
      .post('/api/v1/auth/email/verify')
      .json({ email: 'maya@example.com', code, fullName: 'Maya Chen' })
    verified.assertStatus(200)
    assert.isTrue(verified.body().data.isNew)
    assert.isString(verified.body().data.token)
    const user = await User.findByOrFail('email', 'maya@example.com')
    assert.isNull(user.password)
    assert.equal(user.fullName, 'Maya Chen')

    const reused = await client
      .post('/api/v1/auth/email/verify')
      .json({ email: 'maya@example.com', code })
    reused.assertStatus(401)
  })

  test('signs an existing account back in without duplicating it', async ({ client, assert }) => {
    await User.create({ email: 'maya@example.com', fullName: 'Maya Chen' })
    await client.post('/api/v1/auth/email/code').json({ email: 'maya@example.com' })
    const verified = await client
      .post('/api/v1/auth/email/verify')
      .json({ email: 'maya@example.com', code: inbox.get('maya@example.com') })
    verified.assertStatus(200)
    assert.isFalse(verified.body().data.isNew)
    assert.lengthOf(await User.query().where('email', 'maya@example.com'), 1)
  })

  test('locks a code after five wrong guesses', async ({ client }) => {
    await client.post('/api/v1/auth/email/code').json({ email: 'maya@example.com' })
    const code = inbox.get('maya@example.com')!
    const wrong = code === '000000' ? '111111' : '000000'
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await client
        .post('/api/v1/auth/email/verify')
        .json({ email: 'maya@example.com', code: wrong })
      response.assertStatus(401)
    }
    await db.from('rate_limits').delete()
    const locked = await client
      .post('/api/v1/auth/email/verify')
      .json({ email: 'maya@example.com', code })
    locked.assertStatus(401)
    locked.assertBodyContains({ code: 'TOO_MANY_ATTEMPTS' })
  })

  test('only the newest code works', async ({ client }) => {
    await client.post('/api/v1/auth/email/code').json({ email: 'maya@example.com' })
    const first = inbox.get('maya@example.com')!
    await client.post('/api/v1/auth/email/code').json({ email: 'maya@example.com' })
    const second = inbox.get('maya@example.com')!
    if (first !== second) {
      const old = await client
        .post('/api/v1/auth/email/verify')
        .json({ email: 'maya@example.com', code: first })
      old.assertStatus(401)
    }
    const fresh = await client
      .post('/api/v1/auth/email/verify')
      .json({ email: 'maya@example.com', code: second })
    fresh.assertStatus(200)
  })
})

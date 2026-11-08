import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import { mailerOverride } from '#controllers/passwordless_controller'
import { drainImageDeletions, imageProviderOverride, unusedImages } from '#services/image_cleanup'

const inbox = new Map<string, string>()
const draft = {
  username: 'settings-test',
  name: 'Settings',
  bio: '',
  initials: '',
  theme: 'mint',
  links: [],
}

test.group('Account settings and media lifecycle', (group) => {
  group.setup(() => {
    mailerOverride.current = { sendLoginCode: async (email, code) => void inbox.set(email, code) }
    return () => {
      mailerOverride.current = null
      imageProviderOverride.current = null
    }
  })
  group.each.setup(async () => {
    inbox.clear()
    await db.from('rate_limits').delete()
    await db.from('image_deletions').delete()
    await db.from('login_codes').delete()
    await User.query().delete()
    imageProviderOverride.current = null
  })
  test('requires authentication for every settings operation', async ({ client }) => {
    for (const path of [
      '/api/v1/account/email',
      '/api/v1/account/email/verify',
      '/api/v1/account/logout-all',
      '/api/v1/images/cleanup',
    ]) {
      const result1 = await client.post(path).json({})
      result1.assertStatus(401)
    }
    const result2 = await client.delete('/api/v1/account').json({ email: 'a@example.com' })
    result2.assertStatus(401)
    const result3 = await client.get('/api/v1/images')
    result3.assertStatus(401)
  })
  test('verifies a new email, disconnects identities, and revokes all old sessions', async ({
    client,
    assert,
  }) => {
    const user = await User.create({ email: 'old@example.com' })
    const result4 = await User.accessTokens.create(user)
    const token = result4.value!.release()
    const result5 = await User.accessTokens.create(user)
    const other = result5.value!.release()
    await db
      .table('auth_identities')
      .insert({ user_id: user.id, provider: 'google', subject: 'old-provider' })
    const result6 = await client
      .post('/api/v1/account/email')
      .bearerToken(token)
      .json({ email: 'new@example.com' })
    result6.assertStatus(202)
    const code = inbox.get('new@example.com')!
    const result7 = await User.findOrFail(user.id)
    assert.equal(result7.email, 'old@example.com')
    const result8 = await client
      .post('/api/v1/account/email/verify')
      .bearerToken(token)
      .json({ code })
    result8.assertStatus(204)
    const result9 = await User.findOrFail(user.id)
    assert.equal(result9.email, 'new@example.com')
    assert.lengthOf(await db.from('auth_identities').where('user_id', user.id), 0)
    for (const value of [token, other]) {
      const result10 = await client.get('/api/v1/account/profile').bearerToken(value)
      result10.assertStatus(401)
      // An email-change challenge is not a login code.
    }
    const result11 = await client
      .post('/api/v1/auth/email/verify')
      .json({ email: 'new@example.com', code })
    result11.assertStatus(401)
  })
  test('rejects wrong, expired, exhausted, foreign and already-owned email changes', async ({
    client,
    assert,
  }) => {
    const owner = await User.create({ email: 'owner@example.com' })
    const other = await User.create({ email: 'taken@example.com' })
    const result12 = await client
      .post('/api/v1/account/email')
      .loginAs(owner)
      .json({ email: 'new@example.com' })
    result12.assertStatus(202)
    const code = inbox.get('new@example.com')!
    const result13 = await client.post('/api/v1/account/email/verify').loginAs(other).json({ code })
    result13.assertStatus(422)
    for (let i = 0; i < 5; i++) {
      const result14 = await client
        .post('/api/v1/account/email/verify')
        .loginAs(owner)
        .json({ code: code === '000000' ? '111111' : '000000' })
      result14.assertStatus(422)
    }
    const exhausted = await client
      .post('/api/v1/account/email/verify')
      .loginAs(owner)
      .json({ code })
    exhausted.assertBodyContains({ code: 'TOO_MANY_ATTEMPTS' })
    const result15 = await client
      .post('/api/v1/account/email')
      .loginAs(owner)
      .json({ email: 'new@example.com' })
    result15.assertStatus(202)
    await db
      .from('email_changes')
      .where('user_id', owner.id)
      .update({ expires_at: new Date(0) })
    const result16 = await client
      .post('/api/v1/account/email/verify')
      .loginAs(owner)
      .json({ code: inbox.get('new@example.com') })
    result16.assertBodyContains({ code: 'EXPIRED' })
    const result17 = await client
      .post('/api/v1/account/email')
      .loginAs(owner)
      .json({ email: 'taken@example.com' })
    result17.assertStatus(202)
    const result18 = await client
      .post('/api/v1/account/email/verify')
      .loginAs(owner)
      .json({ code: inbox.get('taken@example.com') })
    result18.assertStatus(409)
    const result19 = await User.findOrFail(owner.id)
    assert.equal(result19.email, 'owner@example.com')
  })
  test('sign out everywhere affects only the authenticated account', async ({ client }) => {
    const a = await User.create({ email: 'a@example.com' })
    const b = await User.create({ email: 'b@example.com' })
    const result20 = await User.accessTokens.create(a)
    const one = result20.value!.release()
    const result21 = await User.accessTokens.create(a)
    const two = result21.value!.release()
    const result22 = await User.accessTokens.create(b)
    const separate = result22.value!.release()
    const result23 = await client.post('/api/v1/account/logout-all').bearerToken(one)
    result23.assertStatus(204)
    for (const token of [one, two]) {
      const result24 = await client.get('/api/v1/account/profile').bearerToken(token)
      result24.assertStatus(401)
    }
    const result25 = await client.get('/api/v1/account/profile').bearerToken(separate)
    result25.assertStatus(200)
  })
  test('deletion requires confirmation, cascades account data, and retains durable media cleanup', async ({
    client,
    assert,
  }) => {
    const user = await User.create({ email: 'delete@example.com' })
    const other = await User.create({ email: 'keep@example.com' })
    const result26 = await client.put('/api/v1/page').loginAs(user).json(draft)
    result26.assertStatus(200)
    const result27 = await client.post('/api/v1/page/publish').loginAs(user)
    result27.assertStatus(200)
    await db.table('images').insert([
      { id: 'owned', user_id: user.id },
      { id: 'other', user_id: other.id },
    ])
    const result28 = await client
      .delete('/api/v1/account')
      .loginAs(user)
      .json({ email: 'wrong@example.com' })
    result28.assertStatus(422)
    assert.isNotNull(await User.find(user.id))
    const result29 = await client
      .delete('/api/v1/account')
      .loginAs(user)
      .json({ email: user.email })
    result29.assertStatus(204)
    assert.isNull(await User.find(user.id))
    const result30 = await client.get('/api/v1/public/pages/settings-test')
    result30.assertStatus(404)
    assert.lengthOf(await db.from('page_versions'), 0)
    assert.lengthOf(await db.from('images').where('user_id', user.id), 0)
    assert.isNotNull(await db.from('images').where('id', 'other').first())
    assert.isNotNull(await db.from('image_deletions').where('id', 'owned').first())
    imageProviderOverride.current = {
      delete: async () => {
        throw new Error('offline')
      },
    }
    await assert.rejects(() => drainImageDeletions(), 'offline')
    assert.isNotNull(await db.from('image_deletions').where('id', 'owned').first())
    const removed: string[] = []
    imageProviderOverride.current = { delete: async (id) => void removed.push(id) }
    await drainImageDeletions()
    assert.deepEqual(removed, ['owned'])
    assert.lengthOf(await db.from('image_deletions'), 0)
  })
  test('cleanup protects drafts, publication, history, fresh uploads and other accounts', async ({
    assert,
    client,
  }) => {
    const user = await User.create({ email: 'photos@example.com' })
    const other = await User.create({ email: 'other@example.com' })
    const url = (id: string) => `https://imagedelivery.net/account/${id}/public`
    const result31 = await client
      .put('/api/v1/page')
      .loginAs(user)
      .json({ ...draft, avatarUrl: url('history') })
    result31.assertStatus(200)
    const result32 = await client.post('/api/v1/page/publish').loginAs(user)
    result32.assertStatus(200)
    const result33 = await client
      .put('/api/v1/page')
      .loginAs(user)
      .json({ ...draft, avatarUrl: url('current') })
    result33.assertStatus(200)
    for (const id of ['history', 'current', 'unused', 'abandoned'])
      await db
        .table('images')
        .insert({ id, user_id: user.id, created_at: new Date(Date.now() - 172800000) })
    await db.table('images').insert([
      { id: 'fresh', user_id: user.id },
      { id: 'other', user_id: other.id, created_at: new Date(0) },
    ])
    assert.deepEqual(await unusedImages(user.id), { total: 5, eligible: 2 })
    const cleanup = await client.post('/api/v1/images/cleanup').loginAs(user)
    cleanup.assertStatus(200)
    cleanup.assertBodyContains({ total: 5, queued: 2 })
    assert.lengthOf(await db.from('image_deletions'), 2)
    // Reattaching a queued photo before the worker runs cancels its deletion.
    const result34 = await client
      .put('/api/v1/page')
      .loginAs(user)
      .json({ ...draft, avatarUrl: url('unused') })
    result34.assertStatus(200)
    const removed: string[] = []
    imageProviderOverride.current = { delete: async (id) => void removed.push(id) }
    await drainImageDeletions()
    assert.deepEqual(removed, ['abandoned'])
    const result35 = await db.from('images').orderBy('id')
    assert.deepEqual(
      result35.map((image) => image.id),
      ['current', 'fresh', 'history', 'other', 'unused']
    )
    assert.lengthOf(await db.from('image_deletions'), 0)
  })
})

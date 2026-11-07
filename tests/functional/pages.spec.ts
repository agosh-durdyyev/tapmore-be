import { test } from '@japa/runner'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

const page = (username: string) => ({
  username,
  name: 'Alex',
  bio: '',
  initials: '',
  theme: 'mint',
  links: [
    {
      id: 'one',
      title: 'Portfolio',
      url: 'https://example.com',
      category: 'Explore',
      featured: true,
      visible: true,
    },
    {
      id: 'two',
      title: 'Private',
      url: 'https://example.com/hidden',
      category: 'Connect',
      featured: false,
      visible: false,
    },
  ],
})

test.group('Page lifecycle', (group) => {
  group.each.setup(async () => {
    await db.from('rate_limits').delete()
    await db.from('images').delete()
    await db.from('pages').delete()
    await User.query().delete()
  })

  test('limits repeated authentication attempts', async ({ client }) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await client.post('/api/v1/auth/email/verify').json({ email: '', code: '' })
      response.assertStatus(422)
    }
    const blocked = await client.post('/api/v1/auth/email/verify').json({ email: '', code: '' })
    blocked.assertStatus(429)
    blocked.assertHeader('retry-after', '60')
  })

  test('requires authentication for drafts and uploads', async ({ client }) => {
    for (const path of ['/api/v1/page', '/api/v1/account/profile']) {
      const response = await client.get(path)
      response.assertStatus(401)
    }
    const upload = await client.post('/api/v1/images/uploads')
    upload.assertStatus(401)
  })

  test('keeps drafts private, publishes snapshots, and unpublishes', async ({ client, assert }) => {
    const user = await User.create({ email: 'alex@example.com', password: 'long-password' })
    const save = await client.put('/api/v1/page').loginAs(user).json(page('alex'))
    save.assertStatus(200)
    const before = await client.get('/api/v1/public/pages/alex')
    before.assertStatus(404)
    const published = await client.post('/api/v1/page/publish').loginAs(user)
    published.assertStatus(200)
    const publicPage = await client.get('/api/v1/public/pages/alex')
    publicPage.assertStatus(200)
    assert.lengthOf(publicPage.body().page.links, 1)
    assert.notProperty(publicPage.body().page, 'user_id')
    const edit = await client
      .put('/api/v1/page')
      .loginAs(user)
      .json({ ...page('alex'), name: 'Changed' })
    edit.assertStatus(200)
    const snapshot = await client.get('/api/v1/public/pages/alex')
    assert.equal(snapshot.body().page.name, 'Alex')
    const rename = await client.put('/api/v1/page').loginAs(user).json(page('alex-new'))
    rename.assertStatus(409)
    const index = await client.get('/api/v1/public/pages')
    index.assertStatus(200)
    assert.deepEqual(
      index.body().pages.map((row: { username: string }) => row.username),
      ['alex']
    )
    const unpublish = await client.delete('/api/v1/page/publish').loginAs(user)
    unpublish.assertStatus(204)
    const after = await client.get('/api/v1/public/pages/alex')
    after.assertStatus(404)
  })

  test('isolates accounts and rejects conflicting username claims', async ({ client, assert }) => {
    const a = await User.create({ email: 'a@example.com', password: 'long-password' })
    const b = await User.create({ email: 'b@example.com', password: 'long-password' })
    const saved = await client.put('/api/v1/page').loginAs(a).json(page('claimed'))
    saved.assertStatus(200)
    const otherDraft = await client.get('/api/v1/page').loginAs(b)
    otherDraft.assertStatus(404)
    const claim = await client.put('/api/v1/page').loginAs(b).json(page('claimed'))
    claim.assertStatus(409)
    const publish = await client.post('/api/v1/page/publish').loginAs(b)
    publish.assertStatus(404)
    const unpublish = await client.delete('/api/v1/page/publish').loginAs(b)
    unpublish.assertStatus(404)
    const reserved = await client.put('/api/v1/page').loginAs(b).json(page('admin'))
    reserved.assertStatus(409)
    const availability = await client.get('/api/v1/usernames/CLAIMED')
    assert.isFalse(availability.body().available)
    const image = await client.post('/api/v1/images/not-owned/confirm').loginAs(b)
    image.assertStatus(404)
  })

  test('rejects unsafe URLs and invalid backup content', async ({ client }) => {
    const user = await User.create({ email: 'url@example.com', password: 'long-password' })
    for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'ftp://example.com']) {
      const draft = page('validname')
      draft.links[0].url = url
      const response = await client.put('/api/v1/page').loginAs(user).json(draft)
      response.assertStatus(422)
    }
    const response = await client.put('/api/v1/page').loginAs(user).json({ version: 1, page: {} })
    response.assertStatus(422)
  })

  test('password sign-up and login are gone', async ({ client }) => {
    for (const path of ['/api/v1/auth/signup', '/api/v1/auth/login']) {
      const response = await client
        .post(path)
        .json({ email: 'alex@example.com', password: 'long-password' })
      response.assertStatus(404)
    }
  })

  test('tokens reach the profile without exposing secrets, and logout revokes them', async ({
    client,
    assert,
  }) => {
    const user = await User.create({ email: 'alex@example.com', fullName: 'Alex Chen' })
    const token = (await User.accessTokens.create(user)).value!.release()
    const profile = await client.get('/api/v1/account/profile').bearerToken(token)
    profile.assertStatus(200)
    assert.notProperty(profile.body().data, 'password')
    const logout = await client.post('/api/v1/account/logout').bearerToken(token)
    logout.assertStatus(200)
    const revoked = await client.get('/api/v1/account/profile').bearerToken(token)
    revoked.assertStatus(401)
  })
})

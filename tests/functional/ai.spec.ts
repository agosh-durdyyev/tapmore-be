import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { aiOverride } from '#services/ai'

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

const imported = {
  found: true,
  name: '  Lena   Okafor ',
  bio: 'Sleep coach for shift workers.',
  template: 'coach',
  links: [
    { title: 'Book a sleep audit', url: 'https://calendly.com/lena/audit', goal: 'Connect' },
    { title: 'Book again', url: 'https://calendly.com/lena/audit/', goal: 'Connect' },
    { title: 'Run this', url: 'javascript:alert(1)', goal: 'Explore' },
    { title: 'Fuck off', url: 'https://example.com/rude', goal: 'Explore' },
    { title: 'Email me', url: 'mailto:lena@example.com', goal: 'Shop' },
    { title: 'Odd goal', url: 'https://example.com/x', goal: 'Dance' },
  ],
}

test.group('AI import and suggestions', (group) => {
  group.each.setup(async () => {
    aiOverride.current = null
    await db.from('rate_limits').delete()
    await db.from('pages').delete()
    await User.query().delete()
  })
  group.teardown(() => {
    aiOverride.current = null
  })

  test('answers 503 when no API key is configured', async ({ client }) => {
    const response = await client.post('/api/v1/ai/import').json({ url: 'linktr.ee/lena' })
    response.assertStatus(503)
    response.assertBodyContains({ code: 'AI_NOT_CONFIGURED' })
  })

  test('imports a page and keeps only safe, clean, unique links', async ({ client, assert }) => {
    aiOverride.current = () => imported
    const response = await client.post('/api/v1/ai/import').json({ url: 'linktr.ee/lena' })
    response.assertStatus(200)
    const page = json(response).page
    assert.equal(page.name, 'Lena Okafor')
    assert.equal(page.template, 'coach')
    assert.deepEqual(
      page.links.map((link: { title: string; category: string }) => [link.title, link.category]),
      [
        ['Book a sleep audit', 'Connect'],
        ['Email me', 'Shop'],
        ['Odd goal', 'Explore'],
      ]
    )
  })

  test('refuses private addresses and pages it cannot read', async ({ client }) => {
    aiOverride.current = () => ({ found: false, name: '', bio: '', template: 'other', links: [] })
    for (const url of [
      'http://localhost:3333',
      '192.168.1.1/admin',
      'mailto:a@b.co',
      'not a url',
    ]) {
      const response = await client.post('/api/v1/ai/import').json({ url })
      response.assertStatus(422)
    }
    const missing = await client.post('/api/v1/ai/import').json({ url: 'example.com' })
    missing.assertStatus(422)
    missing.assertBodyContains({ code: 'IMPORT_NOT_FOUND' })
  })

  test('limits signed-out imports per IP but not signed-in users', async ({ client, assert }) => {
    aiOverride.current = () => imported
    for (let i = 0; i < 3; i++) {
      const response = await client.post('/api/v1/ai/import').json({ url: 'linktr.ee/lena' })
      response.assertStatus(200)
    }
    const blocked = await client.post('/api/v1/ai/import').json({ url: 'linktr.ee/lena' })
    blocked.assertStatus(429)
    assert.isTrue(json(blocked).signInForMore)
    const user = await User.create({ email: 'ai@example.com' })
    const signedIn = await client
      .post('/api/v1/ai/import')
      .loginAs(user)
      .json({ url: 'linktr.ee/lena' })
    signedIn.assertStatus(200)
  })

  test('suggests clean titles and bios, and rejects abusive input', async ({ client, assert }) => {
    aiOverride.current = (task) => ({
      options:
        task === 'titles'
          ? [
              '"Book a free intro call"',
              'Book a free intro call',
              'Pick a time',
              'Fuck you',
              'Say hi',
            ]
          : ['I help shift workers sleep.'],
    })
    const titles = await client
      .post('/api/v1/ai/suggest')
      .json({ kind: 'title', url: 'https://calendly.com/lena/intro' })
    titles.assertStatus(200)
    assert.deepEqual(json(titles).options, ['Book a free intro call', 'Pick a time', 'Say hi'])
    const bio = await client
      .post('/api/v1/ai/suggest')
      .json({ kind: 'bio', name: 'Lena', field: 'coach', links: ['Book a sleep audit'] })
    assert.deepEqual(json(bio).options, ['I help shift workers sleep.'])
    const rude = await client.post('/api/v1/ai/suggest').json({ kind: 'bio', name: 'f.u.c.k' })
    rude.assertStatus(422)
    rude.assertBodyContains({ code: 'CONTENT_NOT_ALLOWED' })
    const empty = await client.post('/api/v1/ai/suggest').json({ kind: 'bio' })
    empty.assertBodyContains({ code: 'NOT_ENOUGH_CONTEXT' })
  })

  test('limits event spam per visitor and page', async ({ client }) => {
    const owner = await User.create({ email: 'spam@example.com' })
    await client.put('/api/v1/page').loginAs(owner).json({
      username: 'spam-target',
      name: 'Sam',
      bio: '',
      initials: '',
      theme: 'mint',
      links: [],
    })
    await client.post('/api/v1/page/publish').loginAs(owner)
    for (let i = 0; i < 30; i++) {
      const view = await client
        .post('/api/v1/public/pages/spam-target/events')
        .json({ eventId: randomUUID(), type: 'view' })
      view.assertStatus(204)
    }
    const blocked = await client
      .post('/api/v1/public/pages/spam-target/events')
      .json({ eventId: randomUUID(), type: 'view' })
    blocked.assertStatus(429)
  })
})

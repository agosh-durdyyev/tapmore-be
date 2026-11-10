import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { geoOverride } from '#services/geo'

const page = {
  username: 'activity-test',
  name: 'Alex',
  bio: '',
  initials: 'AX',
  theme: 'mint',
  links: [
    {
      id: 'work',
      title: 'My work',
      url: 'https://example.com',
      category: 'Explore',
      featured: true,
      visible: true,
    },
    {
      id: 'hidden',
      title: 'Hidden work',
      url: 'https://example.com/hidden',
      category: 'Explore',
      featured: false,
      visible: false,
    },
  ],
}

test.group('Public activity', (group) => {
  group.teardown(() => {
    geoOverride.current = null
  })
  group.each.setup(async () => {
    // Every test visitor resolves to Germany, so the country is recorded and returned.
    geoOverride.current = { country: () => 'DE' }
    await db.from('rate_limits').delete()
    await db.from('pages').delete()
    await User.query().delete()
  })
  test('records real public events once and only exposes IPs to their page owner', async ({
    client,
    assert,
  }) => {
    const owner = await User.create({ email: 'owner@example.com' })
    const other = await User.create({ email: 'other@example.com' })
    await client.put('/api/v1/page').loginAs(owner).json(page)
    const before = await client
      .post('/api/v1/public/pages/activity-test/events')
      .json({ eventId: randomUUID(), type: 'view' })
    before.assertStatus(404)
    await client.post('/api/v1/page/publish').loginAs(owner)
    const eventId = randomUUID()
    for (let i = 0; i < 2; i++) {
      const view = await client
        .post('/api/v1/public/pages/activity-test/events')
        .json({ eventId, type: 'view', ip: '203.0.113.99' })
      view.assertStatus(204)
    }
    const click = await client
      .post('/api/v1/public/pages/activity-test/events')
      .json({ eventId: randomUUID(), type: 'click', linkId: 'work' })
    click.assertStatus(204)
    const hidden = await client
      .post('/api/v1/public/pages/activity-test/events')
      .json({ eventId: randomUUID(), type: 'click', linkId: 'hidden' })
    hidden.assertStatus(422)
    const anonymous = await client.get('/api/v1/page/activity')
    anonymous.assertStatus(401)
    const result = await client.get('/api/v1/page/activity').loginAs(owner)
    result.assertStatus(200)
    result.assertHeader('cache-control', 'no-store')
    const body = result.body()
    assert.equal(body.views, 1)
    assert.equal(body.clicks, 1)
    assert.equal(body.uniqueIps, 1)
    assert.lengthOf(body.events, 2)
    assert.isAbove(isIP(body.events[0].ip), 0)
    assert.notEqual(body.events[0].ip, '203.0.113.99')
    assert.equal(body.events[0].country, 'DE')
    const others = await client.get('/api/v1/page/activity').loginAs(other)
    assert.lengthOf(others.body().events, 0)
    const publicPage = await client.get('/api/v1/public/pages/activity-test')
    assert.notProperty(publicPage.body().page, 'events')
    const ownerPage = await db.from('pages').where('user_id', owner.id).firstOrFail()
    await db.table('page_events').insert({
      event_id: randomUUID(),
      page_id: ownerPage.id,
      kind: 'view',
      ip: '203.0.113.1',
      created_at: new Date(Date.now() - 31 * 86400000),
    })
    await client.get('/api/v1/page/activity').loginAs(owner)
    const expired = await db
      .from('page_events')
      .where('ip', '203.0.113.1')
      .count('* as count')
      .first()
    assert.equal(Number(expired!.count), 0)
  })
  test('summarizes the whole window beyond the latest 50 events and isolates owners', async ({
    client,
    assert,
  }) => {
    const owner = await User.create({ email: 'summary@example.com' })
    const other = await User.create({ email: 'summary-other@example.com' })
    await client.put('/api/v1/page').loginAs(owner).json(page)
    const stored = await db.from('pages').where('user_id', owner.id).firstOrFail()
    const now = new Date()
    const earlier = new Date(now.getTime() - 2 * 86400000)
    await db.table('page_events').insert([
      ...Array.from({ length: 60 }, (_, i) => ({
        event_id: randomUUID(),
        page_id: stored.id,
        kind: 'view',
        ip: `203.0.113.${i + 1}`,
        country: i < 40 ? 'DE' : null,
        created_at: earlier,
      })),
      {
        event_id: randomUUID(),
        page_id: stored.id,
        kind: 'click',
        ip: '203.0.113.1',
        country: 'DE',
        link_id: 'work',
        link_title: 'Original title',
        created_at: now,
      },
      {
        event_id: randomUUID(),
        page_id: stored.id,
        kind: 'view',
        ip: '203.0.113.200',
        country: 'RO',
        created_at: new Date(now.getTime() - 31 * 86400000),
      },
    ])
    const response = await client.get('/api/v1/page/activity').loginAs(owner)
    response.assertStatus(200)
    const body = response.body()
    assert.lengthOf(body.events, 50)
    assert.equal(body.views, 60)
    assert.equal(
      body.daily.reduce((sum: number, day: { views: number }) => sum + day.views, 0),
      60
    )
    assert.equal(
      body.daily.reduce((sum: number, day: { clicks: number }) => sum + day.clicks, 0),
      1
    )
    assert.deepEqual(
      body.countries.map((row: { country: string | null; views: number }) => ({
        country: row.country,
        views: row.views,
      })),
      [
        { country: 'DE', views: 40 },
        { country: null, views: 20 },
      ]
    )
    assert.equal(body.links[0].title, 'Original title')
    assert.isString(body.windowStart)
    assert.isString(body.windowEnd)
    const isolated = await client.get('/api/v1/page/activity').loginAs(other)
    assert.deepEqual(isolated.body().daily, [])
    assert.deepEqual(isolated.body().countries, [])
  })
})

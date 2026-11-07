import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

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
  group.each.setup(async () => {
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
    const others = await client.get('/api/v1/page/activity').loginAs(other)
    assert.lengthOf(others.body().events, 0)
    const publicPage = await client.get('/api/v1/public/pages/activity-test')
    assert.notProperty(publicPage.body().page, 'events')
    const ownerPage = await db.from('pages').where('user_id', owner.id).firstOrFail()
    await db
      .table('page_events')
      .insert({
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
})

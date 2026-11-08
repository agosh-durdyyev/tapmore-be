import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'

test.group('Scheduled publication', (group) => {
  group.each.setup(async () => {
    await db.from('rate_limits').delete()
    await User.query().delete()
  })
  test('preserves schedules in drafts and history, filters public links and rejects inactive clicks', async ({
    client,
    assert,
  }) => {
    const user = await User.create({ email: 'schedule@example.com' })
    const link = {
      title: 'Portfolio',
      url: 'https://example.com',
      category: 'Explore',
      visible: true,
      featured: false,
    }
    const future = new Date(Date.now() + 86400000).toISOString()
    const past = new Date(Date.now() - 86400000).toISOString()
    const page = {
      username: 'schedule',
      name: 'Schedule',
      bio: '',
      initials: '',
      theme: 'mint',
      links: [
        { ...link, id: 'future', startsAt: future },
        { ...link, id: 'expired', endsAt: past },
        { ...link, id: 'active', startsAt: past, endsAt: future },
      ],
    }
    const result1 = await client.put('/api/v1/page').loginAs(user).json(page)
    result1.assertStatus(200)
    const result2 = await client.post('/api/v1/page/publish').loginAs(user)
    result2.assertStatus(200)
    const live = await client.get('/api/v1/public/pages/schedule')
    live.assertStatus(200)
    assert.deepEqual(
      live.body().page.links.map((item: { id: string }) => item.id),
      ['active']
    )
    const saved = await client.get('/api/v1/page').loginAs(user)
    assert.equal(saved.body().page.links[0].startsAt, future)
    const result3 = await db.from('page_versions').first()
    assert.equal(result3.content.links[0].startsAt, future)
    const result4 = await client
      .post('/api/v1/public/pages/schedule/events')
      .json({ eventId: crypto.randomUUID(), type: 'click', linkId: 'future' })
    result4.assertStatus(422)
    const result5 = await client
      .put('/api/v1/page')
      .loginAs(user)
      .json({ ...page, links: [{ ...link, id: 'bad', startsAt: future, endsAt: past }] })
    result5.assertStatus(422)
  })
})

import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

/** Generated route types merge every method on a URL; read bodies loosely here. */

const json = (response: { body(): unknown }) => response.body() as Record<string, any>

const draft = (patch: Record<string, unknown> = {}) => ({
  username: 'versioned',
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
  ],
  ...patch,
})

test.group('Drafts, versions, and A/B tests', (group) => {
  group.each.setup(async () => {
    await db.from('rate_limits').delete()
    await db.from('pages').delete()
    await User.query().delete()
  })

  test('saves a draft without an address and requires one to publish', async ({
    client,
    assert,
  }) => {
    const user = await User.create({ email: 'draft@example.com' })
    const save = await client
      .put('/api/v1/page')
      .loginAs(user)
      .json(draft({ username: '' }))
    save.assertStatus(200)
    assert.equal(json(save).revision, 1)
    assert.isTrue(json(save).usernameAvailable)
    const publish = await client.post('/api/v1/page/publish').loginAs(user)
    publish.assertStatus(422)
    publish.assertBodyContains({ code: 'USERNAME_REQUIRED' })
    const named = await client.put('/api/v1/page').loginAs(user).json(draft())
    named.assertStatus(200)
    const live = await client.post('/api/v1/page/publish').loginAs(user)
    live.assertStatus(200)
    assert.equal(json(live).username, 'versioned')
  })

  test('rejects a save based on a stale revision', async ({ client, assert }) => {
    const user = await User.create({ email: 'conflict@example.com' })
    const first = await client.put('/api/v1/page').loginAs(user).json(draft())
    const revision = json(first).revision
    const laptop = await client
      .put('/api/v1/page')
      .loginAs(user)
      .header('If-Match', String(revision))
      .json(draft({ name: 'From laptop' }))
    laptop.assertStatus(200)
    const phone = await client
      .put('/api/v1/page')
      .loginAs(user)
      .header('If-Match', String(revision))
      .json(draft({ name: 'From phone' }))
    phone.assertStatus(409)
    phone.assertBodyContains({ code: 'DRAFT_CONFLICT', revision: revision + 1 })
    assert.equal(json(phone).page.name, 'From laptop')
  })

  test('records versions, marks the live one, and restores without losing the draft', async ({
    client,
    assert,
  }) => {
    const user = await User.create({ email: 'history@example.com' })
    await client.put('/api/v1/page').loginAs(user).json(draft())
    const published = await client.post('/api/v1/page/publish').loginAs(user)
    assert.equal(json(published).version, 1)
    // Publishing unchanged content reuses the same version.
    const again = await client.post('/api/v1/page/publish').loginAs(user)
    assert.equal(json(again).version, 1)
    await client
      .put('/api/v1/page')
      .loginAs(user)
      .json(draft({ name: 'Second' }))
    const named = await client
      .post('/api/v1/page/versions')
      .loginAs(user)
      .json({ label: 'Before redesign' })
    named.assertStatus(201)
    assert.equal(json(named).version.number, 2)
    const list = await client.get('/api/v1/page/versions').loginAs(user)
    const versions = json(list).versions
    assert.deepEqual(
      versions.map((item: { number: number; live: boolean }) => [item.number, item.live]),
      [
        [2, false],
        [1, true],
      ]
    )
    assert.notProperty(versions[0], 'page')
    await client
      .put('/api/v1/page')
      .loginAs(user)
      .json(draft({ name: 'Unsaved idea' }))
    const restore = await client.post('/api/v1/page/versions/1/restore').loginAs(user)
    restore.assertStatus(200)
    assert.equal(json(restore).page.name, 'Alex')
    const after = await client.get('/api/v1/page/versions').loginAs(user)
    const [restored, kept] = json(after).versions
    assert.equal(restored.source, 'restore')
    assert.equal(restored.label, 'Restored version 1')
    // The draft that was replaced is in history, so the restore can be undone.
    const keptVersion = await client.get(`/api/v1/page/versions/${kept.number}`).loginAs(user)
    assert.equal(json(keptVersion).version.page.name, 'Unsaved idea')
    const others = await User.create({ email: 'other@example.com' })
    const foreign = await client.get('/api/v1/page/versions/1').loginAs(others)
    foreign.assertStatus(404)
  })

  test('splits traffic between versions and attributes events to variants', async ({
    client,
    assert,
  }) => {
    const user = await User.create({ email: 'ab@example.com' })
    await client.put('/api/v1/page').loginAs(user).json(draft())
    const early = await client
      .post('/api/v1/page/experiment')
      .loginAs(user)
      .json({
        name: 'Headline',
        variants: [
          { label: 'A', version: 1, weight: 50 },
          { label: 'B', version: 2, weight: 50 },
        ],
      })
    early.assertStatus(409)
    early.assertBodyContains({ code: 'NOT_PUBLISHED' })
    await client.post('/api/v1/page/publish').loginAs(user)
    await client
      .put('/api/v1/page')
      .loginAs(user)
      .json(
        draft({
          links: [
            {
              id: 'two',
              title: 'Shop',
              url: 'https://example.com/shop',
              category: 'Shop',
              featured: true,
              visible: true,
            },
          ],
        })
      )
    await client.post('/api/v1/page/versions').loginAs(user).json({ label: 'Shop first' })
    const badWeights = await client
      .post('/api/v1/page/experiment')
      .loginAs(user)
      .json({
        name: 'Headline',
        variants: [
          { label: 'A', version: 1, weight: 50 },
          { label: 'B', version: 2, weight: 40 },
        ],
      })
    badWeights.assertStatus(422)
    const start = await client
      .post('/api/v1/page/experiment')
      .loginAs(user)
      .json({
        name: 'Shop link test',
        variants: [
          { label: 'Current', version: 1, weight: 1 },
          { label: 'Shop first', version: 2, weight: 99 },
        ],
      })
    start.assertStatus(201)
    const [control, shop] = json(start).experiment.variants
    const second = await client
      .post('/api/v1/page/experiment')
      .loginAs(user)
      .json({
        name: 'Another',
        variants: [
          { label: 'A', version: 1, weight: 50 },
          { label: 'B', version: 2, weight: 50 },
        ],
      })
    second.assertStatus(409)

    const optedOut = await client.get('/api/v1/public/pages/versioned').qs({ experiment: 'off' })
    assert.isNull(json(optedOut).variant)
    assert.equal(json(optedOut).page.links[0].id, 'one')
    const seen = new Set<number>()
    for (let i = 0; i < 40; i++) {
      const response = await client.get('/api/v1/public/pages/versioned')
      seen.add(json(response).variant)
    }
    assert.isTrue(seen.has(shop.id))

    const view = await client
      .post('/api/v1/public/pages/versioned/events')
      .json({ eventId: randomUUID(), type: 'view', variantId: shop.id })
    view.assertStatus(204)
    // The link exists only in the variant, so it is checked against the variant.
    const click = await client
      .post('/api/v1/public/pages/versioned/events')
      .json({ eventId: randomUUID(), type: 'click', linkId: 'two', variantId: shop.id })
    click.assertStatus(204)
    const wrongLink = await client
      .post('/api/v1/public/pages/versioned/events')
      .json({ eventId: randomUUID(), type: 'click', linkId: 'two', variantId: control.id })
    wrongLink.assertStatus(422)
    const foreignVariant = await client
      .post('/api/v1/public/pages/versioned/events')
      .json({ eventId: randomUUID(), type: 'view', variantId: 999999 })
    foreignVariant.assertStatus(422)

    const results = await client.get('/api/v1/page/experiment').loginAs(user)
    const stats = json(results).experiment.variants
    assert.deepEqual(
      stats.map((item: { views: number; clicks: number }) => [item.views, item.clicks]),
      [
        [0, 0],
        [1, 1],
      ]
    )

    const stop = await client
      .post('/api/v1/page/experiment/stop')
      .loginAs(user)
      .json({ publishVersion: 2 })
    stop.assertStatus(200)
    assert.equal(json(stop).experiment.status, 'stopped')
    const live = await client.get('/api/v1/public/pages/versioned')
    assert.isNull(json(live).variant)
    assert.equal(json(live).page.links[0].id, 'two')
    const history = await client.get('/api/v1/page/versions').loginAs(user)
    assert.isTrue(json(history).versions.find((item: { number: number }) => item.number === 2).live)
    // Deleting the account still removes everything, tests included.
    await user.delete()
    assert.lengthOf(await db.from('experiments'), 0)
  })
})

import { test } from '@japa/runner'
import { linkActive, validSchedule } from '#services/link_schedule'

test('schedules enforce UTC, real dates, ordering, and exact visibility boundaries', ({
  assert,
}) => {
  const startsAt = '2026-11-08T09:00:00.000Z'
  const endsAt = '2026-11-08T10:00:00.000Z'
  const link = { visible: true, startsAt, endsAt }
  assert.isTrue(validSchedule(link))
  assert.isFalse(linkActive(link, Date.parse(startsAt) - 1))
  assert.isTrue(linkActive(link, Date.parse(startsAt)))
  assert.isFalse(linkActive(link, Date.parse(endsAt)))
  assert.isFalse(linkActive({ ...link, visible: false }, Date.parse(startsAt)))
  assert.isTrue(linkActive({ visible: true }))
  for (const invalid of ['not-a-date', '2026-02-30T09:00:00.000Z', '2026-11-08T09:00', null])
    assert.isFalse(validSchedule({ startsAt: invalid }))
  assert.isFalse(validSchedule({ startsAt: endsAt, endsAt: startsAt }))
  assert.isFalse(validSchedule({ startsAt, endsAt: startsAt }))
})

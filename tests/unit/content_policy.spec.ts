import { test } from '@japa/runner'
import { contentIssues, textIssue } from '#services/content_policy'
import { clientIp } from '#services/client_ip'

test('moderation catches obfuscation without blocking ordinary names and educational text', ({
  assert,
}) => {
  for (const value of ['Fuck off', 'f.u.c.k', 'f u c k', 'ＦＵＣＫ', 'f\u200Buck', 'f4gg0t'])
    assert.isNotNull(textIssue(value, 'Title'))
  for (const value of [
    'Scunthorpe arts',
    'Classical music',
    'Dickens reading club',
    'Sex education',
    'Cocktail recipes',
    'Therapist appointments',
  ])
    assert.isNull(textIssue(value, 'Title'))
  assert.deepEqual(
    contentIssues({
      name: 'Alex',
      username: 'fuck-you',
      bio: '',
      initials: '',
      links: [{ title: 'Fuck off' }],
    }).map((issue) => issue.field),
    ['username', 'links.0.title']
  )
})
test('uses Railway-provided client IPs only in that trusted hosting environment', ({ assert }) => {
  assert.equal(clientIp('::ffff:127.0.0.1', '203.0.113.4', false), '127.0.0.1')
  assert.equal(clientIp('10.0.0.1', '203.0.113.4', true), '203.0.113.4')
  assert.equal(clientIp('10.0.0.1', '203.0.113.4, 198.51.100.2', true), '10.0.0.1')
  assert.equal(clientIp('10.0.0.1', 'not-an-ip', true), '10.0.0.1')
  assert.equal(clientIp('10.0.0.1', '2001:db8::1', true), '2001:db8::1')
})

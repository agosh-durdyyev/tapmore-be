import { test } from '@japa/runner'
import { orderByClicks } from '#services/smart_order'

const links = ['a', 'b', 'c', 'd'].map((id) => ({ id }))
const ids = (list: { id: string }[]) => list.map((link) => link.id).join('')

test('keeps the owner order until enough visitors have clicked', ({ assert }) => {
  assert.equal(ids(orderByClicks(links, new Map([['d', 19]]))), 'abcd')
})

test('most-clicked first; ties and unclicked links keep the owner order', ({ assert }) => {
  const clicks = new Map([
    ['c', 12],
    ['d', 5],
    ['b', 5],
  ])
  assert.equal(ids(orderByClicks(links, clicks)), 'cbda')
})

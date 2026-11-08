import { test } from '@japa/runner'
import {
  contrast,
  goalFor,
  linktreeUsername,
  parseLinktree,
  themeAppearance,
} from '#services/linktree_import'

const page = (props: object) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { account: {}, ...props } } })}</script></html>`

test('only linktr.ee profile addresses are recognised', ({ assert }) => {
  assert.equal(linktreeUsername('linktr.ee/agosh'), 'agosh')
  assert.equal(linktreeUsername('https://www.linktr.ee/agosh.space/'), 'agosh.space')
  assert.isNull(linktreeUsername('https://linktr.ee.evil.com/agosh'))
  assert.isNull(linktreeUsername('https://linktr.ee/'))
  assert.isNull(linktreeUsername('https://linktr.ee/a/b'))
  assert.isNull(linktreeUsername('https://example.com/agosh'))
})

test('reads name, bio, grouped links, and social icons; skips gated and unsafe links', ({
  assert,
}) => {
  const result = parseLinktree(
    page({
      pageTitle: '@agosh',
      description: 'Making things.',
      links: [
        { type: 'CLASSIC', title: 'Personal website', url: 'https://agosh.space' },
        {
          type: 'GROUP',
          title: 'Music',
          children: [
            { type: 'CLASSIC', title: 'New single', url: 'https://open.spotify.com/track/1' },
          ],
        },
        {
          type: 'CLASSIC',
          title: 'Members only',
          url: 'https://example.com/a',
          rules: { gate: { activeOrder: ['age'] } },
        },
        { type: 'CLASSIC', title: 'Bad', url: 'javascript:alert(1)' },
        { type: 'CLASSIC', title: 'Duplicate', url: 'https://agosh.space/' },
      ],
      socialLinks: [
        { type: 'INSTAGRAM', url: 'https://instagram.com/agosh' },
        { type: 'EMAIL_ADDRESS', url: 'hi@agosh.space' },
      ],
    })
  )
  assert.equal(result.name, 'agosh')
  assert.equal(result.bio, 'Making things.')
  assert.deepEqual(
    result.links.map((link) => [link.title, link.category, link.display ?? '']),
    [
      ['Personal website', 'Explore', ''],
      ['New single', 'Learn', ''],
      ['Instagram', 'Connect', 'icon'],
      ['Email', 'Connect', 'icon'],
    ]
  )
  assert.equal(result.links[3].url, 'mailto:hi@agosh.space')
})

test('password-protected and non-Linktree pages are refused', ({ assert }) => {
  assert.throws(() => parseLinktree(page({ hasPagePassword: true })), 'IMPORT_LOCKED')
  assert.throws(() => parseLinktree('<html>nothing</html>'), 'IMPORT_NOT_FOUND')
})

test('goals come from the address', ({ assert }) => {
  assert.equal(goalFor('https://shop.agosh.space'), 'Shop')
  assert.equal(goalFor('https://calendly.com/agosh'), 'Connect')
  assert.equal(goalFor('https://www.youtube.com/@agosh'), 'Learn')
  assert.equal(goalFor('https://agosh.space'), 'Explore')
})

test('Linktree themes become readable TapMore appearance settings', ({ assert }) => {
  const dark = themeAppearance({
    background: { color: '#000000' },
    buttonStyle: {
      type: 'FILL',
      backgroundStyle: { color: '#000000' },
      cornerStyle: { type: 'ROUNDED_NONE' },
      textStyle: { color: '#FFFFFF' },
    },
    typeface: { color: '#ffffff', family: 'karla' },
  })!
  assert.equal(dark.preset, 'night')
  assert.equal(dark.buttonShape, 'square')
  assert.notEqual(dark.buttonBackground, '#000000', 'buttons must not vanish into the page')
  const legacy = themeAppearance({
    colors: { linkText: '#1e2330', linkBackground: '#43E660' },
    components: { ProfileBackground: { backgroundColor: '#fff' } },
    fonts: { primary: 'playfair display' },
  })!
  assert.equal(legacy.background, '#ffffff')
  assert.equal(legacy.buttonBackground, '#43e660')
  assert.equal(legacy.font, 'editorial')
  const unreadable = themeAppearance({
    background: { color: '#eeeeee' },
    typeface: { color: '#f5f5f5' },
    buttonStyle: { backgroundStyle: { color: '#ffff00' }, textStyle: { color: '#ffffff' } },
  })!
  assert.isAtLeast(contrast(unreadable.text, unreadable.background), 4.5)
  assert.isAtLeast(contrast(unreadable.buttonText, unreadable.buttonBackground), 4.5)
  assert.isUndefined(themeAppearance(null))
})

import vine from '@vinejs/vine'
export const reservedUsernames = new Set([
  'admin',
  'api',
  'app',
  'auth',
  'dashboard',
  'help',
  // Pages on the landing site share the tapmore.link/<name> namespace.
  'how-it-works',
  'link-in-bio',
  'linktree-alternative',
  'llms',
  'opengraph-image',
  'privacy',
  'sitemap',
  'studio',
  'terms',
  'login',
  'logout',
  'settings',
  'signup',
  'support',
  'tapmore',
  'www',
])
export const usernameField = () =>
  vine
    .string()
    .trim()
    .toLowerCase()
    .minLength(3)
    .maxLength(24)
    .regex(/^[a-z0-9][a-z0-9_-]*$/)
export const usernameValidator = vine.create({ username: usernameField() })
/** A link opens a website (http/https) or starts an email (mailto:). */
const linkUrl = () =>
  vine.union([
    vine.union.if(
      (value) => typeof value === 'string' && /^\s*mailto:/i.test(value),
      vine
        .string()
        .trim()
        .maxLength(330)
        .regex(/^mailto:[^\s@/?#]+@[^\s@/?#]+\.[^\s@/?#]+$/i)
    ),
    vine.union.else(
      vine
        .string()
        .trim()
        .maxLength(2048)
        .url({ protocols: ['http', 'https'], require_protocol: true })
    ),
  ])
const pageFields = () => ({
  name: vine.string().trim().maxLength(100),
  bio: vine.string().trim().maxLength(500),
  initials: vine.string().trim().maxLength(4),
  avatarUrl: vine
    .string()
    .trim()
    .maxLength(2048)
    .url({ protocols: ['http', 'https'], require_protocol: true })
    .optional(),
  appearance: vine
    .object({
      version: vine.literal(1),
      preset: vine.enum(['clay', 'paper', 'sage', 'editorial', 'studio', 'night']),
      background: vine
        .string()
        .regex(/^#[\da-f]{6}$/i)
        .toLowerCase(),
      text: vine
        .string()
        .regex(/^#[\da-f]{6}$/i)
        .toLowerCase(),
      buttonBackground: vine
        .string()
        .regex(/^#[\da-f]{6}$/i)
        .toLowerCase(),
      buttonText: vine
        .string()
        .regex(/^#[\da-f]{6}$/i)
        .toLowerCase(),
      font: vine.enum(['modern', 'editorial', 'mono']),
      buttonShape: vine.enum(['rounded', 'pill', 'square']),
      layout: vine.enum(['stack', 'editorial', 'grid']).optional(),
    })
    .optional(),
  theme: vine.enum(['lilac', 'sand', 'mint']),
  /** Put the links most visitors click first (see services/smart_order). */
  smartOrder: vine.boolean().optional(),
  /** Who the page is for; search engines see a Person or an Organization. */
  kind: vine.enum(['person', 'business']).optional(),
  /** Language of TapMore's words on the public page (tapmore-fe lib/page-language). */
  language: vine
    .enum(['en', 'es', 'fr', 'de', 'pt', 'it', 'ro', 'tr', 'ru', 'uk', 'pl', 'nl'])
    .optional(),
  /** Hide the “Made with tapmore” badge; free for everyone. */
  hideBranding: vine.boolean().optional(),
  links: vine
    .array(
      vine.object({
        id: vine.string().maxLength(100),
        title: vine.string().trim().minLength(1).maxLength(160),
        url: linkUrl(),
        category: vine.enum(['Explore', 'Learn', 'Shop', 'Connect']),
        featured: vine.boolean(),
        display: vine.enum(['icon']).optional(),
        visible: vine.boolean(),
        startsAt: vine.string().maxLength(24).optional(),
        endsAt: vine.string().maxLength(24).optional(),
      })
    )
    .maxLength(100),
})
/** A page that can go live: the address is required. */
export const pageValidator = vine.create({ ...pageFields(), username: usernameField() })
/** A draft saved to the account: the address can wait until publishing. */
export const draftValidator = vine.create({
  ...pageFields(),
  username: vine
    .string()
    .trim()
    .toLowerCase()
    .maxLength(24)
    .regex(/^(|[a-z0-9][a-z0-9_-]{2,23})$/),
})

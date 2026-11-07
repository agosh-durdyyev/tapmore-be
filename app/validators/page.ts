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
export const pageValidator = vine.create({
  name: vine.string().trim().maxLength(100),
  username: usernameField(),
  bio: vine.string().trim().maxLength(500),
  initials: vine.string().trim().maxLength(4),
  avatarUrl: vine
    .string()
    .trim()
    .maxLength(2048)
    .url({ protocols: ['http', 'https'], require_protocol: true })
    .optional(),
  theme: vine.enum(['lilac', 'sand', 'mint']),
  links: vine
    .array(
      vine.object({
        id: vine.string().maxLength(100),
        title: vine.string().trim().minLength(1).maxLength(160),
        url: vine
          .string()
          .trim()
          .maxLength(2048)
          .url({ protocols: ['http', 'https'], require_protocol: true }),
        category: vine.enum(['Explore', 'Learn', 'Shop', 'Connect']),
        featured: vine.boolean(),
        visible: vine.boolean(),
      })
    )
    .maxLength(100),
})

import { textIssue } from '#services/content_policy'
import { safeLinkUrl, type Goal, type ImportedAppearance, type ImportedPage } from '#services/ai'

/**
 * Imports a public Linktree page without the AI model: Linktree embeds the
 * page as JSON (`__NEXT_DATA__`), so name, bio, links, and social icons are
 * read exactly, instantly, and at no cost. Only linktr.ee is ever fetched.
 */

/** "linktr.ee/name", "https://www.linktr.ee/name/" → "name"; anything else → null. */
export function linktreeUsername(input: string): string | null {
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`)
  } catch {
    return null
  }
  if (!['linktr.ee', 'www.linktr.ee'].includes(url.hostname.toLowerCase())) return null
  const name = url.pathname.replace(/^\/+|\/+$/g, '')
  return /^[A-Za-z0-9._-]{1,64}$/.test(name) ? name : null
}

export class LinktreeError extends Error {
  constructor(
    public code: 'IMPORT_NOT_FOUND' | 'IMPORT_LOCKED' | 'IMPORT_UNAVAILABLE',
    public status: number
  ) {
    super(code)
  }
}

const maxBytes = 3_000_000

export async function importLinktree(username: string): Promise<ImportedPage> {
  let response: Response
  try {
    response = await fetch(`https://linktr.ee/${encodeURIComponent(username)}`, {
      // Never follow a redirect: only linktr.ee itself is read.
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'TapMore page importer (+https://www.tapmore.link)',
      },
    })
  } catch {
    throw new LinktreeError('IMPORT_UNAVAILABLE', 502)
  }
  if (response.status === 404 || (response.status >= 300 && response.status < 400))
    throw new LinktreeError('IMPORT_NOT_FOUND', 422)
  if (!response.ok) throw new LinktreeError('IMPORT_UNAVAILABLE', 502)
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > maxBytes) throw new LinktreeError('IMPORT_UNAVAILABLE', 502)
  const html = await response.text()
  if (html.length > maxBytes) throw new LinktreeError('IMPORT_UNAVAILABLE', 502)
  return parseLinktree(html)
}

/** Social icon types Linktree uses, as titles a visitor recognises. */
const socialNames: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  X: 'X',
  TWITTER: 'X',
  FACEBOOK: 'Facebook',
  THREADS: 'Threads',
  SNAPCHAT: 'Snapchat',
  PINTEREST: 'Pinterest',
  LINKEDIN: 'LinkedIn',
  GITHUB: 'GitHub',
  SPOTIFY: 'Spotify',
  APPLE_MUSIC: 'Apple Music',
  SOUNDCLOUD: 'SoundCloud',
  TWITCH: 'Twitch',
  DISCORD: 'Discord',
  TELEGRAM: 'Telegram',
  WHATSAPP: 'WhatsApp',
  EMAIL_ADDRESS: 'Email',
  EMAIL: 'Email',
  BLUESKY: 'Bluesky',
}

const goalHosts: [Goal, RegExp][] = [
  [
    'Shop',
    /(^|\.)(shopify\.com|etsy\.com|amazon\.[a-z.]+|gumroad\.com|depop\.com|ebay\.[a-z.]+)$|^(shop|store)\./,
  ],
  [
    'Learn',
    /(^|\.)(youtube\.com|youtu\.be|spotify\.com|music\.apple\.com|podcasts\.apple\.com|soundcloud\.com|substack\.com|medium\.com|lnk\.to)$/,
  ],
  [
    'Connect',
    /(^|\.)(instagram\.com|tiktok\.com|x\.com|twitter\.com|facebook\.com|threads\.(net|com)|linkedin\.com|calendly\.com|cal\.com|wa\.me|t\.me|discord\.(gg|com))$/,
  ],
]

/** A visitor goal from the address alone; ordinary websites are "see work". */
export function goalFor(url: string): Goal {
  if (url.startsWith('mailto:')) return 'Connect'
  const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
  return goalHosts.find(([, pattern]) => pattern.test(host))?.[0] ?? 'Explore'
}

const text = (value: unknown, max: number) =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : ''

export function parseLinktree(html: string): ImportedPage {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  )
  let props: Record<string, any>
  try {
    props = JSON.parse(match?.[1] ?? '').props.pageProps
  } catch {
    throw new LinktreeError('IMPORT_NOT_FOUND', 422)
  }
  if (!props || typeof props !== 'object' || !props.account)
    throw new LinktreeError('IMPORT_NOT_FOUND', 422)
  if (props.hasPagePassword || props.pageLockType || props.account?.isSensitive)
    throw new LinktreeError('IMPORT_LOCKED', 422)

  const seen = new Set<string>()
  const links: ImportedPage['links'] = []
  const add = (title: string, rawUrl: unknown, extra: { display?: 'icon' } = {}) => {
    const url = safeLinkUrl(rawUrl)
    const key = url?.replace(/\/$/, '').toLowerCase()
    if (!url || !title || !key || seen.has(key) || links.length >= 50) return
    if (textIssue(title, 'title')) return
    seen.add(key)
    links.push({ title, url, category: goalFor(url), ...extra })
  }
  const visit = (items: unknown) => {
    for (const item of Array.isArray(items) ? items : []) {
      if (!item || typeof item !== 'object') continue
      const link = item as Record<string, any>
      // Gated links (age, passcode, sensitive content) stay behind on Linktree.
      if (link.locked || link.rules?.gate?.activeOrder?.length) continue
      if (link.type === 'GROUP') visit(link.children)
      else add(text(link.title, 160) || text(link.metaData?.title, 160), link.url)
    }
  }
  visit(props.links)
  for (const social of Array.isArray(props.socialLinks) ? props.socialLinks : []) {
    const type = String(social?.type ?? '')
    const raw =
      type.startsWith('EMAIL') &&
      typeof social.url === 'string' &&
      !social.url.startsWith('mailto:')
        ? `mailto:${social.url}`
        : social?.url
    add(socialNames[type] ?? type.charAt(0) + type.slice(1).toLowerCase(), raw, { display: 'icon' })
  }

  const name = text(props.pageTitle, 100).replace(/^@/, '')
  const bio = text(props.description, 500)
  const photo = String(props.account?.profilePictureUrl ?? '')
  const appearance = themeAppearance(props.theme)
  return {
    name: textIssue(name, 'name') ? '' : name,
    bio: textIssue(bio, 'bio') ? '' : bio,
    template: 'other',
    links,
    ...(/^https:\/\/ugc\.production\.linktr\.ee\//.test(photo) && photo.length <= 2048
      ? { avatarUrl: photo }
      : {}),
    ...(appearance ? { appearance } : {}),
  }
}

/** "#fff" → "#ffffff"; anything that isn't a hex colour → null. */
function hex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const short = value.trim().match(/^#([\da-f])([\da-f])([\da-f])$/i)
  if (short)
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase()
  return /^#[\da-f]{6}$/i.test(value.trim()) ? value.trim().toLowerCase() : null
}

function luminance(color: string) {
  const [r, g, b] = color
    .slice(1)
    .match(/../g)!
    .map((part) => Number.parseInt(part, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}
export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Mirrors the TapMore presets (lib/appearance.ts in the dashboard and web). */
const presetLooks: [ImportedAppearance['preset'], string][] = [
  ['clay', '#f1d3c2'],
  ['paper', '#eee8d9'],
  ['sage', '#dfe5d8'],
  ['editorial', '#f7f3eb'],
  ['studio', '#e5eae8'],
  ['night', '#252622'],
]
const distance = (a: string, b: string) => {
  const [p, q] = [a, b].map((c) =>
    c
      .slice(1)
      .match(/../g)!
      .map((part) => Number.parseInt(part, 16))
  )
  return p.reduce((sum, value, i) => sum + (value - q[i]) ** 2, 0)
}

/**
 * Linktree's theme (two shapes exist) as TapMore appearance settings. A colour
 * pair that would be hard to read is replaced, so imports never start unreadable.
 */
export function themeAppearance(theme: unknown): ImportedAppearance | undefined {
  if (!theme || typeof theme !== 'object') return undefined
  const t = theme as Record<string, any>
  const background =
    hex(t.background?.color) ?? hex(t.components?.ProfileBackground?.backgroundColor)
  if (!background) return undefined
  const outline = /OUTLINE/.test(String(t.buttonStyle?.type ?? ''))
  let buttonBackground =
    (outline ? background : hex(t.buttonStyle?.backgroundStyle?.color)) ??
    hex(t.colors?.linkBackground) ??
    '#ffffff'
  let buttonText = hex(t.buttonStyle?.textStyle?.color) ?? hex(t.colors?.linkText) ?? '#252622'
  const dark = luminance(background) < 0.18
  let pageText = hex(t.typeface?.color) ?? hex(t.heading?.color) ?? (dark ? '#f2efe6' : '#252622')
  if (contrast(pageText, background) < 4.5) pageText = dark ? '#f2efe6' : '#252622'
  if (contrast(buttonText, buttonBackground) < 4.5)
    buttonText =
      contrast('#ffffff', buttonBackground) >= contrast('#252622', buttonBackground)
        ? '#ffffff'
        : '#252622'
  // Buttons the same colour as the page vanish; give them an edge of contrast.
  if (!outline && distance(buttonBackground, background) < 200) {
    buttonBackground = dark ? '#f2efe6' : '#ffffff'
    buttonText = dark ? '#252622' : buttonText
  }
  const corner = String(t.buttonStyle?.cornerStyle?.type ?? '')
  const family = String(t.typeface?.family ?? t.fonts?.primary ?? '').toLowerCase()
  return {
    version: 1,
    preset: dark
      ? 'night'
      : presetLooks
          .filter(([id]) => id !== 'night')
          .sort((a, b) => distance(a[1], background) - distance(b[1], background))[0][0],
    background,
    text: pageText,
    buttonBackground,
    buttonText,
    font: /mono|courier|code/.test(family)
      ? 'mono'
      : /serif|playfair|lora|merriweather|baskerville|garamond|bodoni|cormorant/.test(family) &&
          !/sans/.test(family)
        ? 'editorial'
        : 'modern',
    buttonShape: /NONE/.test(corner)
      ? 'square'
      : /FULL|CIRCLE|PILL/.test(corner)
        ? 'pill'
        : 'rounded',
  }
}

import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Reads a public web page for AI import. The model can't browse, so the server
 * fetches the page and hands it a trimmed text version. Every hop (including
 * redirects) is resolved and checked so a page can't point us at a private
 * network address.
 */

export interface FetchedPage {
  url: string
  title: string
  description: string
  text: string
  links: { text: string; url: string }[]
}

const MAX_BYTES = 2_000_000
const MAX_REDIRECTS = 3
const TIMEOUT_MS = 10_000

export class PageFetchError extends Error {}

function privateAddress(address: string) {
  const ip = address.toLowerCase().replace(/^::ffff:/, '')
  if (isIP(ip) === 4)
    return /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|22[4-9]\.|2[3-5]\d\.)/.test(
      ip
    )
  return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^ff/.test(ip)
}

async function assertPublic(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
    throw new PageFetchError('bad url')
  if (url.port && !['80', '443'].includes(url.port)) throw new PageFetchError('bad port')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  let addresses = [host]
  if (!isIP(host)) {
    const resolved = await lookup(host, { all: true }).catch(() => [])
    addresses = resolved.map((entry) => entry.address)
  }
  if (!addresses.length || addresses.some(privateAddress)) throw new PageFetchError('private host')
}

async function readCapped(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > MAX_BYTES) {
      await reader.cancel()
      break
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(Buffer.concat(chunks))
}

const entities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}
function decode(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n =
        code[1].toLowerCase() === 'x'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1))
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ''
    }
    return entities[code.toLowerCase()] ?? match
  })
}
const plain = (html: string) =>
  decode(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

function meta(html: string, name: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (!new RegExp(`(?:name|property)\\s*=\\s*["']${name}["']`, 'i').test(tag)) continue
    const content = tag.match(/content\s*=\s*"([^"]*)"|content\s*=\s*'([^']*)'/i)
    if (content) return plain(content[1] ?? content[2] ?? '')
  }
  return ''
}

export function extractPage(html: string, base: string): FetchedPage {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
  const links: FetchedPage['links'] = []
  const seen = new Set<string>()
  for (const match of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].match(/href\s*=\s*"([^"]*)"|href\s*=\s*'([^']*)'|href\s*=\s*([^\s>]+)/i)
    if (!href) continue
    let url: string
    try {
      url = new URL(decode(href[1] ?? href[2] ?? href[3] ?? ''), base).href
    } catch {
      continue
    }
    if (!/^(https?|mailto):/i.test(url) || seen.has(url)) continue
    seen.add(url)
    const label = match[1].match(/aria-label\s*=\s*"([^"]*)"/i)?.[1]
    links.push({ text: plain(match[2]).slice(0, 120) || plain(label ?? '').slice(0, 120), url })
    if (links.length >= 150) break
  }
  return {
    url: base,
    title:
      meta(body, 'og:title') || plain(body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    description: meta(body, 'og:description') || meta(body, 'description'),
    text: plain(body).slice(0, 8000),
    links,
  }
}

export async function fetchPage(source: string): Promise<FetchedPage> {
  let url = new URL(source)
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublic(url)
    let response: Response
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TapMoreImport/1.0; +https://tapmore.link)',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        },
      })
    } catch {
      throw new PageFetchError('unreachable')
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      await response.body?.cancel()
      if (!location) throw new PageFetchError('bad redirect')
      url = new URL(location, url)
      continue
    }
    if (!response.ok) throw new PageFetchError(`status ${response.status}`)
    const type = response.headers.get('content-type') ?? ''
    if (type && !/html|text\/plain/i.test(type)) throw new PageFetchError('not html')
    return extractPage(await readCapped(response), url.href)
  }
  throw new PageFetchError('too many redirects')
}

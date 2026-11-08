import db from '@adonisjs/lucid/services/db'

/** Smart order waits for this many visitors' clicks before changing anything. */
export const smartOrderMinimum = 20
const windowDays = 30

/**
 * Links sorted by how many different visitors clicked each in the last 30
 * days, most first; ties and unclicked links keep the owner's order. Below the
 * minimum there's too little to go on, so the owner's order is returned as is.
 * The featured link is unaffected: the public page always shows it first.
 */
export function orderByClicks<T extends { id: string }>(
  links: T[],
  clicks: Map<string, number>
): T[] {
  const total = [...clicks.values()].reduce((sum, count) => sum + count, 0)
  if (total < smartOrderMinimum) return links
  return links
    .map((link, index) => ({ link, index, count: clicks.get(link.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ link }) => link)
}

/** Distinct visitors (by IP) who clicked each link of a page in the window. */
export async function recentClicks(pageId: number): Promise<Map<string, number>> {
  const since = new Date(Date.now() - windowDays * 86_400_000)
  const rows = await db
    .from('page_events')
    .where('page_id', pageId)
    .where('kind', 'click')
    .where('created_at', '>=', since)
    .whereNotNull('link_id')
    .groupBy('link_id')
    .select('link_id')
    .countDistinct('ip as visitors')
  return new Map(rows.map((row) => [String(row.link_id), Number(row.visitors)]))
}

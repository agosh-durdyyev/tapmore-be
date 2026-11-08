import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

export type VersionSource = 'save' | 'publish' | 'restore'

/** Versions kept per page. Older ones are pruned unless live or used by a test. */
export const maxVersions = 100
/** Autosave records a history checkpoint at most this often. */
export const checkpointMinutes = 10

/** JSON with sorted keys: Postgres jsonb does not keep key order, so compare this. */
export function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => (a < b ? -1 : 1)))
      : item
  )
}

export function sameContent(left: unknown, right: unknown) {
  return canonical(left) === canonical(right)
}

export async function latestVersion(trx: TransactionClientContract, pageId: number) {
  return trx.from('page_versions').where('page_id', pageId).orderBy('number', 'desc').first()
}

/** Appends an immutable snapshot and returns its row. Call inside the page's row lock. */
export async function addVersion(
  trx: TransactionClientContract,
  pageId: number,
  content: unknown,
  source: VersionSource,
  label: string | null = null
) {
  const latest = await latestVersion(trx, pageId)
  const [row] = await trx
    .table('page_versions')
    .insert({
      page_id: pageId,
      number: (latest?.number ?? 0) + 1,
      content: JSON.stringify(content),
      source,
      label,
    })
    .returning(['id', 'number', 'source', 'label', 'created_at'])
  await pruneVersions(trx, pageId)
  return row as { id: number; number: number; source: VersionSource; label: string | null }
}

async function pruneVersions(trx: TransactionClientContract, pageId: number) {
  const keep = trx
    .from('page_versions')
    .where('page_id', pageId)
    .orderBy('number', 'desc')
    .limit(maxVersions)
    .select('id')
  await trx
    .from('page_versions')
    .where('page_id', pageId)
    .whereNotIn('id', keep)
    .whereNotIn(
      'id',
      trx.from('pages').whereNotNull('published_version_id').select('published_version_id')
    )
    .whereNotIn('id', trx.from('experiment_variants').select('version_id'))
    .delete()
}

/** Records a checkpoint when the draft changed and the last version is old enough. */
export async function checkpoint(
  trx: TransactionClientContract,
  pageId: number,
  draft: unknown,
  source: VersionSource = 'save',
  force = false
) {
  const latest = await latestVersion(trx, pageId)
  if (latest && sameContent(latest.content, draft)) return null
  const old =
    !latest || Date.now() - new Date(latest.created_at).getTime() >= checkpointMinutes * 60000
  return force || old ? addVersion(trx, pageId, draft, source) : null
}

export function versionSummary(
  row: { number: number; source: string; label: string | null; created_at: Date | string },
  liveId: number | null,
  id: number
) {
  return {
    number: row.number,
    source: row.source as VersionSource,
    label: row.label,
    createdAt: new Date(row.created_at).toISOString(),
    live: liveId === id,
  }
}

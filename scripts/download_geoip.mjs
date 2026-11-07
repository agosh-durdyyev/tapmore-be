// Downloads the free DB-IP "IP to Country Lite" database (CC BY 4.0, https://db-ip.com).
// Used by the Docker build and for local development: `pnpm geo:download`.
// DB-IP publishes one file per month; fall back to last month early in a new month.
import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

const target = resolve(process.argv[2] ?? 'geo/dbip-country-lite.mmdb')

function month(offset) {
  const date = new Date()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() - offset)
  return date.toISOString().slice(0, 7)
}

for (const offset of [0, 1]) {
  const url = `https://download.db-ip.com/free/dbip-country-lite-${month(offset)}.mmdb.gz`
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) {
    console.warn(`GeoIP: ${url} returned ${response.status}`)
    continue
  }
  const database = gunzipSync(Buffer.from(await response.arrayBuffer()))
  // MaxMind DB files end with a metadata section that starts with this marker.
  if (!database.includes(Buffer.from('\xab\xcd\xefMaxMind.com', 'latin1')))
    throw new Error(`GeoIP: ${url} is not a MaxMind DB file`)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(`${target}.tmp`, database)
  await rename(`${target}.tmp`, target)
  console.log(`GeoIP: saved ${url} to ${target} (${(database.length / 1e6).toFixed(1)} MB)`)
  process.exit(0)
}
throw new Error('GeoIP: no DB-IP country database available for this or last month')

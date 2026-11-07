import { existsSync } from 'node:fs'
import app from '@adonisjs/core/services/app'
import logger from '@adonisjs/core/services/logger'
import { open, type CountryResponse } from 'maxmind'
import env from '#start/env'

/** Maps an IP address to an ISO 3166-1 alpha-2 country code, or null when unknown. */
export interface CountryLookup {
  country(ip: string): string | null
}

/**
 * Country lookups from a local MaxMind-format database (DB-IP Country Lite),
 * so visitor IPs never leave the server.
 */
export class MmdbCountryLookup implements CountryLookup {
  constructor(private reader: { get(ip: string): CountryResponse | null }) {}

  country(ip: string) {
    try {
      const code = this.reader.get(ip)?.country?.iso_code
      return code && /^[A-Z]{2}$/.test(code) ? code : null
    } catch {
      return null // Not a valid IP address.
    }
  }
}

const unknown: CountryLookup = { country: () => null }
let loading: Promise<CountryLookup> | null = null

/** Tests swap in a fixed lookup here. */
export const geoOverride: { current: CountryLookup | null } = { current: null }

function countryLookup(): Promise<CountryLookup> {
  if (geoOverride.current) return Promise.resolve(geoOverride.current)
  loading ??= (async () => {
    const path = env.get('GEOIP_DB_PATH') || app.makePath('geo/dbip-country-lite.mmdb')
    if (!existsSync(path)) {
      logger.warn({ path }, 'GeoIP database not found; visitor countries will be unknown')
      return unknown
    }
    try {
      return new MmdbCountryLookup(await open<CountryResponse>(path))
    } catch (error) {
      logger.error({ path, error }, 'GeoIP database could not be opened')
      return unknown
    }
  })()
  return loading
}

export async function countryFor(ip: string) {
  const lookup = await countryLookup()
  return lookup.country(ip)
}

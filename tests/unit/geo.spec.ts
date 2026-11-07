import { test } from '@japa/runner'
import { existsSync } from 'node:fs'
import { open, type CountryResponse } from 'maxmind'
import { MmdbCountryLookup } from '#services/geo'

test('returns ISO country codes and null for unknown, private or invalid addresses', ({
  assert,
}) => {
  const lookup = new MmdbCountryLookup({
    get(ip: string) {
      if (ip === 'not-an-ip') throw new Error('invalid')
      if (ip === '203.0.113.9') return { country: { iso_code: 'DE' } } as CountryResponse
      if (ip === '198.51.100.1') return { country: { iso_code: 'bogus' } } as CountryResponse
      return null
    },
  })
  assert.equal(lookup.country('203.0.113.9'), 'DE')
  assert.isNull(lookup.country('10.0.0.1'))
  assert.isNull(lookup.country('198.51.100.1'))
  assert.isNull(lookup.country('not-an-ip'))
})

test('reads the downloaded DB-IP database when present', async ({ assert }) => {
  const path = 'geo/dbip-country-lite.mmdb'
  if (!existsSync(path)) return // Run `pnpm geo:download` to include this check.
  const lookup = new MmdbCountryLookup(await open<CountryResponse>(path))
  assert.equal(lookup.country('8.8.8.8'), 'US')
  assert.equal(lookup.country('2a00:1450:4001:80b::200e'), 'DE')
  assert.isNull(lookup.country('127.0.0.1'))
})

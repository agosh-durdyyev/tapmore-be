/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  // Node
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.string(),

  // App
  APP_KEY: Env.schema.secret(),
  APP_URL: Env.schema.string({ format: 'url', tld: false }),

  DB_POOL_MAX: Env.schema.number.optional(),
  DB_HOST: Env.schema.string(),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.secret(),
  DB_DATABASE: Env.schema.string(),
  DB_SSL: Env.schema.boolean.optional(),
  CORS_ORIGIN: Env.schema.string.optional(),
  CLOUDFLARE_ACCOUNT_ID: Env.schema.string.optional(),
  CLOUDFLARE_IMAGES_TOKEN: Env.schema.secret.optional(),

  // Passwordless sign-in. Comma-separated so web and iOS clients can share one backend.
  GOOGLE_CLIENT_IDS: Env.schema.string.optional(),
  APPLE_CLIENT_IDS: Env.schema.string.optional(),
  RESEND_API_KEY: Env.schema.secret.optional(),
  MAIL_FROM: Env.schema.string.optional(),

  // Visitor countries. Defaults to geo/dbip-country-lite.mmdb (see scripts/download_geoip.mjs).
  GEOIP_DB_PATH: Env.schema.string.optional(),

  // Session
  SESSION_DRIVER: Env.schema.enum(['cookie', 'memory', 'database'] as const),
})

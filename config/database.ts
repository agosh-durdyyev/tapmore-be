import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'
export default defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      pool: { min: 0, max: env.get('DB_POOL_MAX', 10) },
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD').release(),
        database: env.get('DB_DATABASE'),
        ssl: env.get('DB_SSL') ? { rejectUnauthorized: true } : false,
      },
      migrations: { naturalSort: true, paths: ['database/migrations'] },
      schemaGeneration: { enabled: true, rulesPaths: ['./database/schema_rules.js'] },
    },
  },
})

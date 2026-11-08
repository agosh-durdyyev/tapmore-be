import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Server-side drafts, version history, and A/B tests.
 *
 * - pages.username becomes optional: a draft can be saved before an address is chosen.
 * - pages.revision guards autosave against two devices overwriting each other.
 * - page_versions holds immutable snapshots. pages.published_version_id is the
 *   source of truth for what is live; pages.published stays as a copy of that
 *   version so older code (and a rollback) keeps working.
 * - experiments / experiment_variants split public traffic between versions, and
 *   page_events.variant_id records which variant a visit or click came from.
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('pages', (table) => {
      table.setNullable('username')
      table.integer('revision').notNullable().defaultTo(0)
    })

    this.schema.createTable('page_versions', (table) => {
      table.increments('id')
      table
        .integer('page_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pages')
        .onDelete('CASCADE')
      table.integer('number').notNullable()
      table.jsonb('content').notNullable()
      // save | publish | restore
      table.string('source', 8).notNullable()
      table.string('label', 80).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.unique(['page_id', 'number'])
    })

    this.schema.alterTable('pages', (table) => {
      table
        .integer('published_version_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('page_versions')
        .onDelete('SET NULL')
    })

    this.schema.createTable('experiments', (table) => {
      table.increments('id')
      table
        .integer('page_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pages')
        .onDelete('CASCADE')
      table.string('name', 80).notNullable()
      // running | stopped
      table.string('status', 8).notNullable()
      table.timestamp('started_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('ended_at', { useTz: true }).nullable()
      table.index(['page_id', 'started_at'])
    })
    // At most one running test per page.
    this.schema.raw(
      "create unique index experiments_one_running on experiments (page_id) where status = 'running'"
    )

    this.schema.createTable('experiment_variants', (table) => {
      table.increments('id')
      table
        .integer('experiment_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('experiments')
        .onDelete('CASCADE')
      // CASCADE so deleting a page (or account) removes its tests cleanly. Versions
      // used by a test are never pruned: pruneVersions in app/services/page_versions.ts
      // skips them, which is what keeps test history intact.
      table
        .integer('version_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('page_versions')
        .onDelete('CASCADE')
      table.string('label', 40).notNullable()
      table.integer('weight').notNullable()
    })

    this.schema.alterTable('page_events', (table) => {
      table
        .integer('variant_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('experiment_variants')
        .onDelete('SET NULL')
      table.index(['variant_id'])
    })

    // Backfill: every published page gets its live snapshot as version 1, and
    // a draft that differs from it becomes version 2.
    this.defer(async (db) => {
      const pages = await db.from('pages').select('id', 'draft', 'published', 'published_at')
      for (const page of pages) {
        let number = 0
        if (page.published) {
          number++
          const [version] = await db
            .table('page_versions')
            .insert({
              page_id: page.id,
              number,
              content: JSON.stringify(page.published),
              source: 'publish',
              created_at: page.published_at ?? new Date(),
            })
            .returning('id')
          await db
            .from('pages')
            .where('id', page.id)
            .update({ published_version_id: version.id ?? version })
        }
        if (!page.published || JSON.stringify(page.published) !== JSON.stringify(page.draft)) {
          number++
          await db.table('page_versions').insert({
            page_id: page.id,
            number,
            content: JSON.stringify(page.draft),
            source: 'save',
          })
        }
      }
    })
  }

  async down() {
    this.schema.alterTable('page_events', (table) => {
      table.dropColumn('variant_id')
    })
    this.schema.dropTable('experiment_variants')
    this.schema.dropTable('experiments')
    this.schema.alterTable('pages', (table) => {
      table.dropColumn('published_version_id')
    })
    this.schema.dropTable('page_versions')
    this.schema.alterTable('pages', (table) => {
      table.dropColumn('revision')
      // Fails if any draft has no address yet; give those rows one before rolling back.
      table.dropNullable('username')
    })
  }
}

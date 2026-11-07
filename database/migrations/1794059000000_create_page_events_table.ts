import { BaseSchema } from '@adonisjs/lucid/schema'
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('page_events', (table) => {
      table.bigIncrements('id')
      table.uuid('event_id').notNullable().unique()
      table
        .integer('page_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('pages')
        .onDelete('CASCADE')
      table.string('kind', 8).notNullable()
      table.string('ip', 45).notNullable()
      table.string('link_id', 100).nullable()
      table.string('link_title', 160).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.index(['page_id', 'created_at'])
      table.index(['created_at'])
    })
  }
  async down() {
    this.schema.dropTable('page_events')
  }
}

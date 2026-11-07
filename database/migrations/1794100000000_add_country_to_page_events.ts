import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('page_events', (table) => {
      // ISO 3166-1 alpha-2, looked up from the visitor IP when the event is recorded.
      table.string('country', 2).nullable()
    })
  }

  async down() {
    this.schema.alterTable('page_events', (table) => {
      table.dropColumn('country')
    })
  }
}

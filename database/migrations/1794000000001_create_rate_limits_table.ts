import { BaseSchema } from '@adonisjs/lucid/schema'
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('rate_limits', (table) => {
      table.string('key', 64).primary()
      table.integer('attempts').notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable().index()
    })
  }
  async down() {
    this.schema.dropTable('rate_limits')
  }
}

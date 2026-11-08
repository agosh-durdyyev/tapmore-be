import { BaseSchema } from '@adonisjs/lucid/schema'
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('email_changes', (table) => {
      table.integer('user_id').primary().references('id').inTable('users').onDelete('CASCADE')
      table.string('email', 254).notNullable()
      table.string('code_hash', 64).notNullable()
      table.integer('attempts').notNullable().defaultTo(0)
      table.timestamp('expires_at', { useTz: true }).notNullable()
    })
    // Independent of users so deleting an account cannot discard pending provider cleanup.
    this.schema.createTable('image_deletions', (table) => {
      table.string('id').primary()
      table.integer('owner_id').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }
  async down() {
    this.schema.dropTable('email_changes')
    this.schema.dropTable('image_deletions')
  }
}

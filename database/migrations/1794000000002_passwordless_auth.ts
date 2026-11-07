import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Accounts created with Google, Apple or an email code have no password.
    this.schema.alterTable('users', (table) => {
      table.string('password').nullable().alter()
    })

    this.schema.createTable('auth_identities', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('provider', 20).notNullable()
      table.string('subject', 255).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.unique(['provider', 'subject'])
      table.index(['user_id'])
    })

    this.schema.createTable('login_codes', (table) => {
      table.increments('id')
      table.string('email', 254).notNullable().index()
      table.string('code_hash', 64).notNullable()
      table.integer('attempts').notNullable().defaultTo(0)
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.timestamp('consumed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable('login_codes')
    this.schema.dropTable('auth_identities')
    // Leave password nullable on rollback: rows created without one would fail a NOT NULL.
  }
}

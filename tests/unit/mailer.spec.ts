import { test } from '@japa/runner'
import logger from '@adonisjs/core/services/logger'
import { MailerError, ResendMailer } from '#services/mailer'

function captureErrors() {
  const calls: unknown[][] = []
  const original = logger.error.bind(logger)
  logger.error = ((...args: unknown[]) => {
    calls.push(args)
  }) as typeof logger.error
  return { calls, restore: () => (logger.error = original) }
}

test('logs why Resend rejected a login code email without logging the code', async ({ assert }) => {
  const errors = captureErrors()
  const reply = {
    statusCode: 403,
    name: 'validation_error',
    message: 'The tapmore.link domain is not verified.',
  }
  const fakeFetch: typeof fetch = async () => Response.json(reply, { status: 403 })
  try {
    await assert.rejects(
      () =>
        new ResendMailer('key', 'TapMore <hello@tapmore.link>', fakeFetch).sendLoginCode(
          'a@b.co',
          '123456'
        ),
      MailerError
    )
  } finally {
    errors.restore()
  }
  assert.lengthOf(errors.calls, 1)
  const [context] = errors.calls[0] as [Record<string, unknown>]
  assert.equal(context.status, 403)
  assert.include(String(context.detail), 'domain is not verified')
  assert.notInclude(JSON.stringify(errors.calls), '123456')
})

test('logs when Resend cannot be reached', async ({ assert }) => {
  const errors = captureErrors()
  const fakeFetch: typeof fetch = async () => {
    throw new TypeError('fetch failed')
  }
  try {
    await assert.rejects(
      () => new ResendMailer('key', 'from@x.co', fakeFetch).sendLoginCode('a@b.co', '123456'),
      MailerError
    )
  } finally {
    errors.restore()
  }
  assert.lengthOf(errors.calls, 1)
  assert.include(JSON.stringify(errors.calls[0]), 'fetch failed')
})

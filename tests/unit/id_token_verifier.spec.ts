import { generateKeyPairSync, sign } from 'node:crypto'
import { test } from '@japa/runner'
import IdTokenVerifier from '#services/id_token_verifier'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'key-1', alg: 'RS256', use: 'sig' }
const NOW = 1_800_000_000_000

function token(claims: Record<string, unknown>, kid = 'key-1') {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const body = `${encode({ alg: 'RS256', kid, typ: 'JWT' })}.${encode({
    iss: 'https://accounts.google.com',
    aud: 'web-client',
    sub: 'google-user-1',
    email: 'Maya@Example.com',
    email_verified: true,
    iat: NOW / 1000 - 10,
    exp: NOW / 1000 + 3600,
    ...claims,
  })}`
  return `${body}.${sign('RSA-SHA256', Buffer.from(body), privateKey).toString('base64url')}`
}

function verifier(onFetch?: () => void) {
  const transport: typeof fetch = async () => {
    onFetch?.()
    return Response.json({ keys: [jwk] })
  }
  return new IdTokenVerifier({ google: ['web-client'] }, transport, () => NOW)
}

test.group('IdTokenVerifier', () => {
  test('accepts a valid Google token and normalizes the email', async ({ assert }) => {
    const identity = await verifier().verify('google', token({}))
    assert.deepEqual(identity, {
      provider: 'google',
      subject: 'google-user-1',
      email: 'maya@example.com',
      emailVerified: true,
    })
  })

  test('reads Apple-style string booleans for email_verified', async ({ assert }) => {
    const identity = await verifier().verify('google', token({ email_verified: 'true' }))
    assert.isTrue(identity.emailVerified)
  })

  test('caches provider keys between sign-ins', async ({ assert }) => {
    let fetches = 0
    const instance = verifier(() => fetches++)
    await instance.verify('google', token({}))
    await instance.verify('google', token({}))
    assert.equal(fetches, 1)
  })

  test('rejects tampered, foreign or stale tokens', async ({ assert }) => {
    const valid = token({})
    const [header, , signature] = valid.split('.')
    const forged = `${header}.${Buffer.from(JSON.stringify({ sub: 'attacker' })).toString('base64url')}.${signature}`
    const cases: [string, string, RegExp][] = [
      ['forged payload', forged, /signature/i],
      ['other app', token({ aud: 'someone-else' }), /audience/i],
      ['other issuer', token({ iss: 'https://evil.example' }), /issuer/i],
      ['expired', token({ exp: NOW / 1000 - 3600 }), /expired/i],
      ['unknown key', token({}, 'key-2'), /unknown signing key/i],
      ['no email', token({ email: undefined }), /email/i],
    ]
    for (const [label, value, message] of cases) {
      const error = await verifier()
        .verify('google', value)
        .then(
          () => null,
          (reason: Error) => reason
        )
      assert.match(error?.message ?? 'accepted', message, label)
    }
  })

  test('checks the nonce when the client sent one', async ({ assert }) => {
    await assert.rejects(
      () => verifier().verify('google', token({ nonce: 'abc' }), 'xyz'),
      /nonce/i
    )
    const identity = await verifier().verify('google', token({ nonce: 'abc' }), 'abc')
    assert.equal(identity.subject, 'google-user-1')
  })

  test('refuses providers that are not configured', async ({ assert }) => {
    await assert.rejects(() => verifier().verify('apple', token({})), /not configured/i)
  })
})

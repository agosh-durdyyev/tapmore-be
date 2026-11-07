import { test } from '@japa/runner'
import CloudflareImages from '#services/cloudflare_images'

test('allocates private uploads with short expiry and server-side authorization', async ({
  assert,
}) => {
  const fakeFetch: typeof fetch = async (input, init) => {
    assert.equal(
      String(input),
      'https://api.cloudflare.com/client/v4/accounts/account/images/v2/direct_upload'
    )
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer secret')
    const body = init?.body as FormData
    assert.equal(body.get('creator'), '42')
    assert.equal(body.get('requireSignedURLs'), 'true')
    const expiry = new Date(String(body.get('expiry'))).getTime()
    assert.isAbove(expiry, Date.now())
    assert.isBelow(expiry, Date.now() + 11 * 60 * 1000)
    return Response.json({
      success: true,
      result: { id: 'image-id', uploadURL: 'https://upload.imagedelivery.net/one-time' },
    })
  }
  const result = await new CloudflareImages('account', 'secret', fakeFetch).createUpload(42)
  assert.deepEqual(result, {
    id: 'image-id',
    uploadURL: 'https://upload.imagedelivery.net/one-time',
  })
  assert.notProperty(result, 'token')
})

test('provider failures do not expose credentials or upstream diagnostics', async ({ assert }) => {
  const fakeFetch: typeof fetch = async () =>
    Response.json(
      { success: false, errors: [{ message: 'sensitive upstream details' }] },
      { status: 403 }
    )
  await assert.rejects(
    () => new CloudflareImages('account', 'secret', fakeFetch).createUpload(1),
    'Image provider rejected request'
  )
})

test('confirmation verifies upload completion with Cloudflare', async ({ assert }) => {
  const pending: typeof fetch = async () =>
    Response.json({ success: true, result: { id: 'id', draft: true } })
  const ready: typeof fetch = async () =>
    Response.json({ success: true, result: { id: 'id', uploaded: new Date().toISOString() } })
  assert.isFalse(await new CloudflareImages('account', 'secret', pending).isUploaded('id'))
  assert.isTrue(await new CloudflareImages('account', 'secret', ready).isUploaded('id'))
})

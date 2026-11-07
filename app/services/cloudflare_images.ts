export class CloudflareImagesError extends Error {}
export default class CloudflareImages {
  constructor(
    private accountId: string,
    private token: string,
    private transport: typeof fetch = fetch
  ) {}

  private async call(path: string, init: RequestInit = {}) {
    let response: Response
    try {
      response = await this.transport(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.accountId)}/images/${path}`,
        {
          ...init,
          headers: { Authorization: `Bearer ${this.token}` },
          signal: AbortSignal.timeout(10000),
        }
      )
    } catch {
      throw new CloudflareImagesError('Image provider unavailable')
    }
    let data: { success: boolean; result: Record<string, unknown> }
    try {
      data = (await response.json()) as typeof data
    } catch {
      throw new CloudflareImagesError('Invalid image provider response')
    }
    if (!response.ok || !data?.success || !data.result)
      throw new CloudflareImagesError('Image provider rejected request')
    return data.result
  }

  async createUpload(userId: number) {
    const body = new FormData()
    body.set('requireSignedURLs', 'true')
    body.set('creator', String(userId))
    body.set('expiry', new Date(Date.now() + 10 * 60 * 1000).toISOString())
    const result = await this.call('v2/direct_upload', { method: 'POST', body })
    if (typeof result.id !== 'string' || typeof result.uploadURL !== 'string')
      throw new CloudflareImagesError('Invalid image provider response')
    return { id: result.id, uploadURL: result.uploadURL }
  }

  async isUploaded(id: string) {
    const result = await this.call(`v1/${encodeURIComponent(id)}`)
    return result.draft !== true && typeof result.uploaded === 'string'
  }
}

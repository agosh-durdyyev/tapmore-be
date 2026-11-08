import type { ApplicationService } from '@adonisjs/core/types'
import logger from '@adonisjs/core/services/logger'
import { cleanUnusedImages, drainImageDeletions } from '#services/image_cleanup'
export default class ImageCleanupProvider {
  constructor(protected app: ApplicationService) {}
  private timer?: ReturnType<typeof setInterval>
  private work?: Promise<void>
  private nextSweep = 0
  async ready() {
    if (this.app.getEnvironment() !== 'web') return
    const run = () => {
      if (this.work) return
      this.work = (async () => {
        if (Date.now() >= this.nextSweep) {
          await cleanUnusedImages()
          this.nextSweep = Date.now() + 3600000
        }
        await drainImageDeletions()
      })()
        .catch(() => logger.warn('Image cleanup could not finish; queued files will be retried'))
        .finally(() => {
          this.work = undefined
        })
    }
    run()
    this.timer = setInterval(run, 60000)
    this.timer.unref()
  }
  async shutdown() {
    if (this.timer) clearInterval(this.timer)
    await this.work
  }
}

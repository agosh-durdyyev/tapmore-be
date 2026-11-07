import type { ApplicationService } from '@adonisjs/core/types'
import logger from '@adonisjs/core/services/logger'
import { purgeOldActivity } from '#services/activity_retention'
export default class ActivityProvider {
  constructor(protected app: ApplicationService) {}
  private cleanup?: ReturnType<typeof setInterval>
  async ready() {
    if (this.app.getEnvironment() !== 'web') return
    const purge = () =>
      void purgeOldActivity().catch(() =>
        logger.warn('Activity retention cleanup could not finish')
      )
    purge()
    this.cleanup = setInterval(purge, 60 * 60 * 1000)
    this.cleanup.unref()
  }
  async shutdown() {
    if (this.cleanup) clearInterval(this.cleanup)
  }
}

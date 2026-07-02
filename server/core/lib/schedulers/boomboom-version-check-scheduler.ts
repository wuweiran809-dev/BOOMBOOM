import { doJSONRequest } from '@server/helpers/requests.js'
import { ApplicationModel } from '@server/models/application/application.js'
import { compareSemVer } from '@boomboom/boomboom-core-utils'
import { JoinBoomBoomVersions } from '@boomboom/boomboom-models'
import { logger, loggerTagsFactory } from '../../helpers/logger.js'
import { CONFIG } from '../../initializers/config.js'
import { BOOMBOOM_VERSION, SCHEDULER_INTERVALS_MS } from '../../initializers/constants.js'
import { Notifier } from '../notifier/index.js'
import { AbstractScheduler } from './abstract-scheduler.js'

const lTags = loggerTagsFactory('schedulers')

export class BoomBoomVersionCheckScheduler extends AbstractScheduler {
  private static instance: AbstractScheduler

  protected schedulerIntervalMs = SCHEDULER_INTERVALS_MS.CHECK_BOOMBOOM_VERSION

  private constructor () {
    super({ randomRunOnEnable: true })
  }

  protected async internalExecute () {
    return this.checkLatestVersion()
  }

  private async checkLatestVersion () {
    if (CONFIG.BOOMBOOM.CHECK_LATEST_VERSION.ENABLED === false) return

    logger.info('Checking latest BoomBoom version.', lTags())

    const { body } = await doJSONRequest<JoinBoomBoomVersions>(CONFIG.BOOMBOOM.CHECK_LATEST_VERSION.URL, { preventSSRF: false })

    if (!body?.boomboom?.latestVersion) {
      logger.warn('Cannot check latest BoomBoom version: body is invalid.', { body, ...lTags() })
      return
    }

    const latestVersion = body.boomboom.latestVersion
    const application = await ApplicationModel.load()

    // Already checked this version
    if (application.latestBoomBoomVersion === latestVersion) return

    if (compareSemVer(BOOMBOOM_VERSION, latestVersion) < 0) {
      application.latestBoomBoomVersion = latestVersion
      await application.save()

      Notifier.Instance.notifyOfNewBoomBoomVersion(application, latestVersion)
    }
  }

  static get Instance () {
    return this.instance || (this.instance = new this())
  }
}

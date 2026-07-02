import { UserNotificationType, UserRight } from '@boomboom/boomboom-models'
import { t } from '@server/helpers/i18n.js'
import { logger } from '@server/helpers/logger.js'
import { UserNotificationModel } from '@server/models/user/user-notification.js'
import { UserModel } from '@server/models/user/user.js'
import { MApplication, MUserDefault, MUserWithNotificationSetting, UserNotificationModelForApi } from '@server/types/models/index.js'
import { AbstractNotification } from '../common/abstract-notification.js'

export type NewBoomBoomVersionForAdminsPayload = {
  application: MApplication
  latestVersion: string
}

export class NewBoomBoomVersionForAdmins extends AbstractNotification<NewBoomBoomVersionForAdminsPayload> {
  private admins: MUserDefault[]

  async prepare () {
    // Use the debug right to know who is an administrator
    this.admins = await UserModel.listWithRight(UserRight.MANAGE_DEBUG)
  }

  log () {
    logger.info('Notifying %s admins of new BoomBoom version %s.', this.admins.length, this.payload.latestVersion)
  }

  getSetting (user: MUserWithNotificationSetting) {
    return user.NotificationSetting.newBoomBoomVersion
  }

  getTargetUsers () {
    return this.admins
  }

  createNotification (user: MUserWithNotificationSetting) {
    const notification = UserNotificationModel.build<UserNotificationModelForApi>({
      type: UserNotificationType.NEW_BOOMBOOM_VERSION,
      userId: user.id,
      applicationId: this.payload.application.id
    })
    notification.Application = this.payload.application

    return notification
  }

  createEmail (user: MUserWithNotificationSetting) {
    const to = { email: user.email, language: user.getLanguage() }

    return {
      to,
      template: 'boomboom-version-new',
      subject: t('A new BoomBoom version is available: {latestVersion}', to.language, { latestVersion: this.payload.latestVersion }),
      locals: {
        latestVersion: this.payload.latestVersion
      }
    }
  }
}

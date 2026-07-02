import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { UserNotificationsComponent } from '@app/shared/shared-notifications/user-notifications.component'
import { MUiService } from '../../m-ui.service'

@Component({
  selector: 'm-notifications',
  templateUrl: './m-notifications.component.html',
  styleUrls: [ './m-notifications.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ GlobalIconComponent, UserNotificationsComponent ]
})
export class MNotificationsComponent {
  ui = inject(MUiService)

  readonly userNotification = viewChild<UserNotificationsComponent>('userNotification')

  openMenu () {
    this.ui.openMenu()
  }

  markAllAsRead () {
    this.userNotification()?.markAllAsRead()
  }

  hasUnread () {
    const c = this.userNotification()
    if (!c) return false
    return c.notifications.filter(n => n.payload.read === false).length !== 0
  }
}

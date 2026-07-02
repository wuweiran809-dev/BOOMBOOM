import { CommonModule } from '@angular/common'
import { Component, viewChild, ChangeDetectionStrategy, inject } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { MenuService, ScreenService } from '@app/core'
import { UserNotificationsComponent } from '@app/shared/shared-notifications/user-notifications.component'
import { GlobalIconComponent } from '../../shared/shared-icons/global-icon.component'

type NotificationSortType = 'createdAt' | 'read'

@Component({
  templateUrl: './my-account-notifications.component.html',
  styleUrls: [ './my-account-notifications.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ CommonModule, RouterLink, GlobalIconComponent, FormsModule, UserNotificationsComponent ]
})
export class MyAccountNotificationsComponent {
  private screenService = inject(ScreenService)
  private menuService = inject(MenuService)

  readonly userNotification = viewChild<UserNotificationsComponent>('userNotification')

  _notificationSortType: NotificationSortType = 'createdAt'

  get isMobile () {
    return this.screenService.isInMobileView()
  }

  get notificationSortType () {
    return !this.hasUnreadNotifications()
      ? 'createdAt'
      : this._notificationSortType
  }

  set notificationSortType (type: NotificationSortType) {
    this._notificationSortType = type
  }

  toggleMenu () {
    this.menuService.toggleMenu()
  }

  markAllAsRead () {
    this.userNotification()?.markAllAsRead()
  }

  hasUnreadNotifications () {
    const component = this.userNotification()
    if (!component) return false

    return component.notifications.filter(n => n.payload.read === false).length !== 0
  }

  onChangeSortColumn () {
    this.userNotification().changeSortColumn(this.notificationSortType)
  }
}

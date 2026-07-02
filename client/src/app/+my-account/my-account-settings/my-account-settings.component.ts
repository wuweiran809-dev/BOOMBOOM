import { ViewportScroller } from '@angular/common'
import { HttpErrorResponse } from '@angular/common/http'
import { AfterViewChecked, ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService, Notifier, ScreenService, ServerService, User, UserService } from '@app/core'
import { genericUploadErrorHandler } from '@app/helpers'
import { shallowCopy } from '@boomboom/boomboom-core-utils'
import { ActorAvatarEditComponent } from '../../shared/shared-actor-image-edit/actor-avatar-edit.component'
import { UserQuotaComponent } from '../../shared/shared-main/users/user-quota.component'
import { UserInterfaceSettingsComponent } from '../../shared/shared-user-settings/user-interface-settings.component'
import { UserVideoSettingsComponent } from '../../shared/shared-user-settings/user-video-settings.component'
import { AccountTokenSessionsComponent } from '../../shared/shared-users/account-token-sessions.component'
import { GlobalIconComponent } from '../../shared/shared-icons/global-icon.component'
import { MyAccountChangeEmailComponent } from './my-account-change-email/my-account-change-email.component'
import { MyAccountChangePasswordComponent } from './my-account-change-password/my-account-change-password.component'
import { MyAccountDangerZoneComponent } from './my-account-danger-zone/my-account-danger-zone.component'
import {
  MyAccountNotificationPreferencesComponent
} from './my-account-notification-preferences/my-account-notification-preferences.component'
import { MyAccountProfileComponent } from './my-account-profile/my-account-profile.component'
import { MyAccountTwoFactorButtonComponent } from './my-account-two-factor/my-account-two-factor-button.component'

type SettingsSection = 'security' | 'privacy' | 'profile' | 'notifications' | 'interface'

const WIFI_ONLY_KEY = 'boomboom-wifi-only-playback'

@Component({
  selector: 'my-account-settings',
  templateUrl: './my-account-settings.component.html',
  styleUrls: [ './my-account-settings.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    ActorAvatarEditComponent,
    UserQuotaComponent,
    MyAccountProfileComponent,
    UserInterfaceSettingsComponent,
    UserVideoSettingsComponent,
    MyAccountNotificationPreferencesComponent,
    MyAccountChangePasswordComponent,
    MyAccountTwoFactorButtonComponent,
    MyAccountChangeEmailComponent,
    MyAccountDangerZoneComponent,
    AccountTokenSessionsComponent,
    GlobalIconComponent
  ]
})
export class MyAccountSettingsComponent implements OnInit, AfterViewChecked {
  private viewportScroller = inject(ViewportScroller)
  private userService = inject(UserService)
  private authService = inject(AuthService)
  private notifier = inject(Notifier)
  private screenService = inject(ScreenService)
  private serverService = inject(ServerService)
  private router = inject(Router)

  user: User

  expandedSection = signal<SettingsSection | null>(null)
  wifiOnly = signal(false)

  private lastScrollHash: string

  get isMobile () {
    return this.screenService.isInMobileView()
  }

  get userInformationLoaded () {
    return this.authService.userInformationLoaded
  }

  get hasClassicAuth () {
    return this.user?.pluginAuth === null
  }

  get appVersion () {
    return this.serverService.getHTMLConfig()?.serverVersion || ''
  }

  ngOnInit () {
    this.user = this.authService.getUser()

    try {
      this.wifiOnly.set(localStorage.getItem(WIFI_ONLY_KEY) === 'true')
    } catch (err) {
      // localStorage might be unavailable
    }
  }

  ngAfterViewChecked () {
    if (window.location.hash && window.location.hash !== this.lastScrollHash) {
      this.viewportScroller.scrollToAnchor(window.location.hash.replace('#', ''))

      this.lastScrollHash = window.location.hash
    }
  }

  // ---------------------------------------------------------------------------
  // Mobile helpers
  // ---------------------------------------------------------------------------

  toggleSection (section: SettingsSection) {
    this.expandedSection.update(current => current === section ? null : section)
  }

  isExpanded (section: SettingsSection) {
    return this.expandedSection() === section
  }

  goBack () {
    this.router.navigate([ '/my-account/me' ])
  }

  toggleWifiOnly () {
    const next = !this.wifiOnly()
    this.wifiOnly.set(next)

    try {
      localStorage.setItem(WIFI_ONLY_KEY, next ? 'true' : 'false')
    } catch (err) {
      // ignore
    }
  }

  clearCache () {
    try {
      const authKeys: Record<string, string> = {}

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('token') || key.includes('boomboom-'))) {
          authKeys[key] = localStorage.getItem(key)
        }
      }

      localStorage.clear()

      // Restore auth + preference keys so the user stays logged in
      for (const key of Object.keys(authKeys)) {
        localStorage.setItem(key, authKeys[key])
      }

      this.notifier.success($localize`Cache cleared.`)
    } catch (err) {
      this.notifier.error($localize`Could not clear the cache.`)
    }
  }

  logout () {
    this.authService.logout()
    this.router.navigate([ '/login' ])
  }

  // ---------------------------------------------------------------------------
  // Avatar (shared with desktop)
  // ---------------------------------------------------------------------------

  onAvatarChange (formData: FormData) {
    this.userService.changeAvatar(formData)
      .subscribe({
        next: data => {
          this.notifier.success($localize`Avatar changed.`)

          this.user.updateAccountAvatar(data.avatars)

          // So my-actor-avatar component detects changes
          this.user.account = shallowCopy(this.user.account)
        },

        error: (err: HttpErrorResponse) =>
          genericUploadErrorHandler({
            err,
            name: $localize`avatar`,
            notifier: this.notifier
          })
      })
  }

  onAvatarDelete () {
    this.userService.deleteAvatar()
      .subscribe({
        next: () => {
          this.notifier.success($localize`Avatar deleted.`)

          this.user.updateAccountAvatar()

          // So my-actor-avatar component detects changes
          this.user.account = shallowCopy(this.user.account)
        },

        error: (err: HttpErrorResponse) => this.notifier.error(err.message)
      })
  }
}

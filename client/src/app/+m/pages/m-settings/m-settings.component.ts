import { ChangeDetectionStrategy, Component, LOCALE_ID, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { AuthService, Notifier, ServerService } from '@app/core'
import { UserService } from '@app/core/users/user.service'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'

const WIFI_KEY = 'boomboom-wifi-only-playback'
const NOTIFY_KEY = 'boomboom-notify-enabled'

@Component({
  selector: 'm-settings',
  templateUrl: './m-settings.component.html',
  styleUrls: [ './m-settings.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ GlobalIconComponent, FormsModule ]
})
export class MSettingsComponent implements OnInit {
  private auth = inject(AuthService)
  private router = inject(Router)
  private notifier = inject(Notifier)
  private serverService = inject(ServerService)
  private userService = inject(UserService)
  private localeId = inject(LOCALE_ID)

  notifyOn = signal(true)
  wifiOnly = signal(false)

  // profile edit (real)
  displayName = signal('')
  savingProfile = signal(false)
  avatarUploading = signal(false)

  constructor () {
    try {
      this.wifiOnly.set(localStorage.getItem(WIFI_KEY) === 'true')
      this.notifyOn.set(localStorage.getItem(NOTIFY_KEY) !== 'false')
    } catch {}
  }

  ngOnInit () {
    this.displayName.set(this.user?.account?.displayName || this.user?.username || '')
  }

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  get user () {
    return this.auth.getUser()
  }

  get appVersion () {
    return this.serverService.getHTMLConfig()?.serverVersion || ''
  }

  get coinsDisplay (): string {
    return ((this.user as any)?.coins ?? 0).toLocaleString('en-US')
  }

  get avatarUrl (): string {
    const avatars = this.user?.account?.avatars
    if (!avatars?.length) return ''
    return avatars[avatars.length - 1].path
  }

  get autoPlayNext (): boolean {
    return !!(this.user as any)?.autoPlayNextVideo
  }

  back () {
    this.router.navigate([ '/m/me' ])
  }

  // ---- interface language ----

  get isZh (): boolean {
    return (this.localeId || '').toLowerCase().startsWith('zh')
  }

  // Switch the compiled UI locale via the clientLanguage cookie, then reload.
  switchLanguage (target: 'en-US' | 'zh-Hans-CN') {
    if (target.startsWith('zh') === this.isZh) return

    try {
      const secure = location.protocol === 'https:' ? '; secure; samesite=none' : ''
      document.cookie = 'clientLanguage=' + target + '; path=/; max-age=7776000' + secure
    } catch {}

    window.location.reload()
  }

  go (commands: any[]) {
    this.router.navigate(commands)
  }

  // ---- profile (real) ----

  onAvatarPicked (event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const form = new FormData()
    form.append('avatarfile', file, file.name)

    this.avatarUploading.set(true)
    this.userService.changeAvatar(form).subscribe({
      next: () => {
        this.auth.refreshUserInformation()
        this.notifier.success($localize`:@@boomboom.m.settings.avatarUpdated:Avatar updated`)
        this.avatarUploading.set(false)
      },
      error: () => {
        this.notifier.error($localize`:@@boomboom.m.settings.avatarFailed:Failed to update avatar`)
        this.avatarUploading.set(false)
      }
    })

    input.value = ''
  }

  saveProfile () {
    const name = this.displayName().trim()
    if (!name || this.savingProfile()) return

    this.savingProfile.set(true)
    this.userService.updateMyProfile({ displayName: name }).subscribe({
      next: () => {
        this.auth.refreshUserInformation()
        this.notifier.success($localize`:@@boomboom.m.settings.profileSaved:Saved`)
        this.savingProfile.set(false)
      },
      error: () => {
        this.notifier.error($localize`:@@boomboom.m.settings.profileFailed:Failed to save`)
        this.savingProfile.set(false)
      }
    })
  }

  toggleAutoPlay () {
    const next = !this.autoPlayNext
    this.userService.updateMyProfile({ autoPlayNextVideo: next }).subscribe({
      next: () => this.auth.refreshUserInformation()
    })
  }

  // ---- local preferences ----

  toggleNotify () {
    const next = !this.notifyOn()
    this.notifyOn.set(next)
    try { localStorage.setItem(NOTIFY_KEY, next ? 'true' : 'false') } catch {}
  }

  toggleWifi () {
    const next = !this.wifiOnly()
    this.wifiOnly.set(next)
    try { localStorage.setItem(WIFI_KEY, next ? 'true' : 'false') } catch {}
  }

  clearCache () {
    try {
      const keep: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && (k.includes('token') || k.includes('boomboom-'))) keep[k] = localStorage.getItem(k)
      }
      localStorage.clear()
      for (const k of Object.keys(keep)) localStorage.setItem(k, keep[k])
      this.notifier.success($localize`:@@boomboom.m.settings.cacheCleared:Cache cleared`)
    } catch {
      this.notifier.error($localize`:@@boomboom.m.settings.cacheClearFailed:Failed to clear cache`)
    }
  }

  logout () {
    this.auth.logout()
    this.router.navigate([ '/m/login' ])
  }
}

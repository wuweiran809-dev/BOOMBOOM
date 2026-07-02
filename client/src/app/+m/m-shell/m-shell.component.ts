import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { AuthService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { MUiService } from '../m-ui.service'

@Component({
  selector: 'm-shell',
  templateUrl: './m-shell.component.html',
  styleUrls: [ './m-shell.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ RouterOutlet, RouterLink, RouterLinkActive, GlobalIconComponent ]
})
export class MShellComponent {
  private auth = inject(AuthService)
  private router = inject(Router)
  ui = inject(MUiService)

  readonly notLoggedInLabel = $localize`:@@boomboom.m.shell.notLoggedIn:Not logged in`

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  get user () {
    return this.auth.getUser()
  }

  get coinsDisplay (): string {
    return ((this.user as any)?.coins ?? 0).toLocaleString('en-US')
  }

  get isVip (): boolean {
    const exp = (this.user as any)?.vipExpiration
    return exp ? new Date(exp).getTime() > Date.now() : false
  }

  getAvatarUrl () {
    const avatars = this.user?.account?.avatars
    if (!avatars?.length) return ''
    return avatars[avatars.length - 1].path
  }

  onUploadClick () {
    this.ui.closeMenu()
    if (!this.isLoggedIn) {
      this.router.navigate([ '/m/login' ])
      return
    }
    this.router.navigate([ '/m/upload' ])
  }

  go (commands: any[]) {
    this.ui.closeMenu()
    this.router.navigate(commands)
  }

  logout () {
    this.ui.closeMenu()
    this.auth.logout()
    this.router.navigate([ '/m/login' ])
  }
}

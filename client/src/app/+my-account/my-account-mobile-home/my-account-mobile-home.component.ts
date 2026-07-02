import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { AuthService, MenuService, ScreenService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'

@Component({
  selector: 'my-account-mobile-home',
  templateUrl: './my-account-mobile-home.component.html',
  styleUrls: [ './my-account-mobile-home.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ CommonModule, RouterLink, GlobalIconComponent ]
})
export class MyAccountMobileHomeComponent {
  private authService = inject(AuthService)
  private screenService = inject(ScreenService)
  private menuService = inject(MenuService)

  get isMobile () {
    return this.screenService.isInMobileView()
  }

  get authUser () {
    return this.authService.getUser()
  }

  getUserAvatarUrl () {
    if (!this.authUser?.account?.avatars?.length) return ''
    return this.authUser.account.avatars[0].path
  }

  toggleMenu () {
    this.menuService.toggleMenu()
  }

  logout () {
    this.authService.logout()
  }
}

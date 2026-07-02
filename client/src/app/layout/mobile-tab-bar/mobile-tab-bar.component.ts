import { Component, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router'
import { AuthService, ScreenService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { filter } from 'rxjs'

@Component({
  selector: 'my-mobile-tab-bar',
  templateUrl: './mobile-tab-bar.component.html',
  styleUrls: [ './mobile-tab-bar.component.scss' ],
  imports: [ RouterLink, RouterLinkActive, GlobalIconComponent ]
})
export class MobileTabBarComponent {
  private auth = inject(AuthService)
  private router = inject(Router)
  private screen = inject(ScreenService)

  private onMRoute = signal(this.isMRoute(this.router.url))

  constructor () {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(e => this.onMRoute.set(this.isMRoute(e.urlAfterRedirects)))
  }

  private isMRoute (url: string) {
    return url.startsWith('/m/') || url === '/m'
  }

  isMobile () {
    // The new BoomBoom mobile module (/m) provides its own tab bar
    if (this.onMRoute()) return false

    return this.screen.isInMobileView()
  }

  isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  onUploadClick () {
    if (!this.isLoggedIn()) {
      this.router.navigate([ '/login' ])
      return
    }
    this.router.navigate([ '/videos/publish' ])
  }
}

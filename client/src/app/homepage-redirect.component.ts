import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { is18nPath } from '@boomboom/boomboom-core-utils'
import { ScreenService } from './core'
import { RedirectService } from './core/routing/redirect.service'

/*
 * Historically use a component instead of an homepage because of a weird issue when using router.navigate in guard
 *
 * Since we also want to use the `skipLocationChange` option, we couldn't use a guard that returns a UrlTree
 * See https://github.com/angular/angular/issues/27148
 * The issue is fixed but we keep this component it works well and is simple enough
 */

@Component({
  template: '',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true
})
export class HomepageRedirectComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private redirectService = inject(RedirectService)
  private screenService = inject(ScreenService)
  private router = inject(Router)

  ngOnInit () {
    const url = this.route.snapshot.url

    // Mobile visitors go to the dedicated BoomBoom mobile module
    if (this.screenService.isInMobileView()) {
      this.router.navigate([ '/m/feed' ], { skipLocationChange: false })
      return
    }

    if (url.length === 0 || is18nPath('/' + url[0])) {
      this.redirectService.redirectToHomepage({ skipLocationChange: true })
    }
  }
}

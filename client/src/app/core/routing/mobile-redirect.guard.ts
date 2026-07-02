import { inject } from '@angular/core'
import { CanActivateFn, Router, UrlTree } from '@angular/router'
import { ScreenService } from '../wrappers/screen.service'

/**
 * On mobile, the BoomBoom mobile module (/m) fully replaces the legacy pages.
 * Any guarded legacy route redirects to its /m equivalent (from route.data.mobileTarget).
 * `:param` tokens in the target are filled from the matched route params.
 * Desktop is never affected.
 */
export const mobileRedirectGuard: CanActivateFn = (route): boolean | UrlTree => {
  const screen = inject(ScreenService)
  const router = inject(Router)

  if (!screen.isInMobileView()) return true

  let target = route.data?.['mobileTarget'] as string
  if (!target) return true

  for (const [ key, value ] of Object.entries(route.params || {})) {
    target = target.replace(`:${key}`, String(value))
  }

  return router.parseUrl(target)
}

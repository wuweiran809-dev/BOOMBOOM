import { Injectable, signal } from '@angular/core'

// Shared UI state for the mobile (+m) module — currently the side-menu drawer.
@Injectable({ providedIn: 'root' })
export class MUiService {
  readonly menuOpen = signal(false)

  openMenu () {
    this.menuOpen.set(true)
  }

  closeMenu () {
    this.menuOpen.set(false)
  }

  toggleMenu () {
    this.menuOpen.update(v => !v)
  }
}

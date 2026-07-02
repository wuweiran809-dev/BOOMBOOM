import { Component, AfterViewChecked, inject, ChangeDetectionStrategy } from '@angular/core'
import { ViewportScroller } from '@angular/common'

@Component({
  selector: 'my-about-boomboom',
  templateUrl: './about-boomboom.component.html',
  styleUrls: [ './about-boomboom.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true
})
export class AboutBoomboomComponent implements AfterViewChecked {
  private viewportScroller = inject(ViewportScroller)

  private lastScrollHash: string

  ngAfterViewChecked () {
    if (window.location.hash && window.location.hash !== this.lastScrollHash) {
      this.viewportScroller.scrollToAnchor(window.location.hash.replace('#', ''))

      this.lastScrollHash = window.location.hash
    }
  }
}

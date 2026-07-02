import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { DramaGenService, DramaGenWork } from '../../dramagen/dramagen.service'

@Component({
  selector: 'm-create',
  templateUrl: './m-create.component.html',
  styleUrls: [ './m-create.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ GlobalIconComponent ]
})
export class MCreateComponent implements OnInit {
  private dramaGen = inject(DramaGenService)
  private auth = inject(AuthService)
  private router = inject(Router)

  works = signal<DramaGenWork[]>([])
  loadingWorks = signal(false)

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  get isConfigured () {
    return this.dramaGen.isConfigured
  }

  ngOnInit () {
    if (this.isConfigured && this.isLoggedIn) this.loadWorks()
  }

  back () {
    this.router.navigate([ '/m/me' ])
  }

  startCreate () {
    if (!this.isLoggedIn) {
      this.router.navigate([ '/m/login' ])
      return
    }
    // Outbound with source attribution (utm_source=boomboom&ref=<userId>)
    this.dramaGen.openCreate('/create')
  }

  goUpload () {
    if (!this.isLoggedIn) {
      this.router.navigate([ '/m/login' ])
      return
    }
    this.router.navigate([ '/m/upload' ])
  }

  private loadWorks () {
    this.loadingWorks.set(true)
    this.dramaGen.listMyWorks().subscribe({
      next: works => { this.works.set(works || []); this.loadingWorks.set(false) },
      error: () => this.loadingWorks.set(false)
    })
  }
}

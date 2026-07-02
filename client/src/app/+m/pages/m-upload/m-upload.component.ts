import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'

@Component({
  selector: 'm-upload',
  templateUrl: './m-upload.component.html',
  styleUrls: [ './m-upload.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ FormsModule, GlobalIconComponent ]
})
export class MUploadComponent {
  private router = inject(Router)

  title = ''
  desc = ''
  paidUnlock = signal(false)

  readonly genres = [
    $localize`:@@boomboom.m.upload.genre.0:Urban`,
    $localize`:@@boomboom.m.upload.genre.1:Romance`,
    $localize`:@@boomboom.m.upload.genre.2:Underdog`,
    $localize`:@@boomboom.m.upload.genre.3:Period`,
    $localize`:@@boomboom.m.upload.genre.4:Mystery`
  ]

  selectedGenre = signal(this.genres[0])

  cancel () {
    this.router.navigate([ '/m/feed' ])
  }

  selectGenre (g: string) {
    this.selectedGenre.set(g)
  }

  togglePaid () {
    this.paidUnlock.update(v => !v)
  }

  // Delegate to the real (working) upload engine, carrying the drama title
  publish () {
    this.router.navigate([ '/videos/publish' ], {
      queryParams: this.title.trim() ? { dramaTitle: this.title.trim() } : {}
    })
  }
}

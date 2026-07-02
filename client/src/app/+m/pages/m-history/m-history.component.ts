import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { AuthService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { UserHistoryService } from '@app/shared/shared-main/users/user-history.service'
import { Video } from '@app/shared/shared-main/video/video.model'
import { MVideoGridComponent } from '../../shared/m-video-grid.component'

// 观看历史 — real watch history from /users/me/history/videos
@Component({
  selector: 'm-history',
  templateUrl: './m-history.component.html',
  styleUrls: [ './m-history.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ UserHistoryService ],
  imports: [ GlobalIconComponent, RouterLink, MVideoGridComponent ]
})
export class MHistoryComponent implements OnInit {
  private history = inject(UserHistoryService)
  private router = inject(Router)
  private auth = inject(AuthService)

  videos = signal<Video[]>([])
  loading = signal(true)

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  ngOnInit () {
    if (!this.isLoggedIn) {
      this.loading.set(false)
      return
    }

    this.history.list({ currentPage: 1, itemsPerPage: 40 }).subscribe({
      next: ({ data }) => {
        this.videos.set(data)
        this.loading.set(false)
      },
      error: () => this.loading.set(false)
    })
  }

  open (v: Video) {
    this.router.navigate([ '/m/w', v.shortUUID || v.uuid ])
  }
}

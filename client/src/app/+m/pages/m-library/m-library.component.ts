import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { AuthService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { VideoChannel } from '@app/shared/shared-main/channel/video-channel.model'
import { UserSubscriptionService } from '@app/shared/shared-user-subscription/user-subscription.service'

// 我的追剧 — full list of followed channels (real subscriptions)
@Component({
  selector: 'm-library',
  templateUrl: './m-library.component.html',
  styleUrls: [ './m-library.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ UserSubscriptionService ],
  imports: [ GlobalIconComponent, RouterLink ]
})
export class MLibraryComponent implements OnInit {
  private subscriptionService = inject(UserSubscriptionService)
  private router = inject(Router)
  private auth = inject(AuthService)

  channels = signal<VideoChannel[]>([])
  loading = signal(true)

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  ngOnInit () {
    if (!this.isLoggedIn) {
      this.loading.set(false)
      return
    }

    this.subscriptionService.listSubscriptions({ pagination: { currentPage: 1, itemsPerPage: 60 }, search: '' })
      .subscribe({
        next: ({ data }) => {
          this.channels.set(data)
          this.loading.set(false)
        },
        error: () => this.loading.set(false)
      })
  }

  avatar (c: VideoChannel): string {
    const a = c?.avatars
    return a && a.length ? a[a.length - 1].path : ''
  }

  open (c: VideoChannel) {
    this.router.navigate([ '/m/c', c.nameWithHost ])
  }
}

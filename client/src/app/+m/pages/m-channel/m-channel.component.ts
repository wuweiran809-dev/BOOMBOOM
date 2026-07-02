import { Location } from '@angular/common'
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { AuthService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { VideoChannel } from '@app/shared/shared-main/channel/video-channel.model'
import { VideoChannelService } from '@app/shared/shared-main/channel/video-channel.service'
import { Video } from '@app/shared/shared-main/video/video.model'
import { VideoService } from '@app/shared/shared-main/video/video.service'
import { UserSubscriptionService } from '@app/shared/shared-user-subscription/user-subscription.service'
import { VideoSortField } from '@boomboom/boomboom-models'
import { MVideoGridComponent } from '../../shared/m-video-grid.component'

// Native /m channel page: header + real channel videos + follow toggle.
// Keeps drama navigation inside the /m theme (no jump to old /c page).
@Component({
  selector: 'm-channel',
  templateUrl: './m-channel.component.html',
  styleUrls: [ './m-channel.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ UserSubscriptionService, VideoChannelService ],
  imports: [ GlobalIconComponent, RouterLink, MVideoGridComponent ]
})
export class MChannelComponent implements OnInit {
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private location = inject(Location)
  private auth = inject(AuthService)
  private channelService = inject(VideoChannelService)
  private videoService = inject(VideoService)
  private subscriptionService = inject(UserSubscriptionService)

  handle = ''
  channel = signal<VideoChannel | null>(null)
  videos = signal<Video[]>([])
  loading = signal(true)
  subscribed = signal(false)

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  ngOnInit () {
    this.handle = this.route.snapshot.paramMap.get('handle') || ''
    if (!this.handle) {
      this.loading.set(false)
      return
    }

    this.channelService.get(this.handle).subscribe({ next: c => this.channel.set(c) })

    this.videoService.listChannelVideos({
      videoChannel: { nameWithHost: this.handle },
      videoPagination: { currentPage: 1, itemsPerPage: 30, totalItems: 0 },
      sort: '-publishedAt' as VideoSortField
    }).subscribe({
      next: ({ data }) => {
        this.videos.set(data)
        this.loading.set(false)
      },
      error: () => this.loading.set(false)
    })

    if (this.isLoggedIn) {
      this.subscriptionService.doesSubscriptionExist(this.handle).subscribe({ next: e => this.subscribed.set(!!e) })
    }
  }

  avatar (): string {
    const a = this.channel()?.avatars
    return a && a.length ? a[a.length - 1].path : ''
  }

  toggleFollow () {
    if (!this.isLoggedIn) {
      this.router.navigate([ '/m/login' ])
      return
    }

    const op = this.subscribed()
      ? this.subscriptionService.deleteSubscription(this.handle)
      : this.subscriptionService.addSubscription(this.handle)

    op.subscribe({ next: () => this.subscribed.set(!this.subscribed()) })
  }

  open (v: Video) {
    this.router.navigate([ '/m/w', v.shortUUID || v.uuid ])
  }

  back () {
    this.location.back()
  }
}

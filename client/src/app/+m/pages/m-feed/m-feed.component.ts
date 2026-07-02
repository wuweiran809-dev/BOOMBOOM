import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core'
import { Router } from '@angular/router'
import { AuthService, Notifier } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { Video } from '@app/shared/shared-main/video/video.model'
import { VideoService } from '@app/shared/shared-main/video/video.service'
import { UserSubscriptionService } from '@app/shared/shared-user-subscription/user-subscription.service'
import { VideoSortField } from '@boomboom/boomboom-models'
import { MUiService } from '../../m-ui.service'

type FeedTab = 'following' | 'recommend' | 'ranking'

@Component({
  selector: 'm-feed',
  templateUrl: './m-feed.component.html',
  styleUrls: [ './m-feed.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ UserSubscriptionService ],
  imports: [ GlobalIconComponent ]
})
export class MFeedComponent implements OnInit {
  private videoService = inject(VideoService)
  private router = inject(Router)
  private auth = inject(AuthService)
  private subscriptionService = inject(UserSubscriptionService)
  private notifier = inject(Notifier)
  ui = inject(MUiService)

  likedIds = signal<Set<string>>(new Set())
  followed = signal<Set<string>>(new Set())

  readonly stage = viewChild<ElementRef<HTMLElement>>('stage')

  videos = signal<Video[]>([])
  index = signal(0)
  loading = signal(false)
  activeTab = signal<FeedTab>('recommend')

  readonly descFallback = $localize`:@@boomboom.m.feed.descFallback:A must-watch drama you won't be able to stop.`

  private startY = 0
  private curY = 0
  private dragging = false
  private pagination = { currentPage: 1, itemsPerPage: 10, totalItems: 0 }

  ngOnInit () {
    this.load()
  }

  get current (): Video | undefined {
    return this.videos()[this.index()]
  }

  get marquee (): string {
    const vids = this.videos().slice(0, 4)
    if (vids.length === 0) return $localize`:@@boomboom.m.feed.marqueeFallback:💥 Trending · must-watch dramas`
    return vids
      .map(v => $localize`:@@boomboom.m.feed.marqueeItem:💥 ${v.name}:name: · ${this.formatCount(v.views)}:count: views`)
      .join('    ///    ')
  }

  setTab (tab: FeedTab) {
    if (this.activeTab() === tab) return
    this.activeTab.set(tab)
    this.videos.set([])
    this.index.set(0)
    this.pagination.currentPage = 1
    this.load()
  }

  private sortForTab (): VideoSortField {
    switch (this.activeTab()) {
      case 'following': return '-publishedAt' as VideoSortField
      default: return '-trending' as VideoSortField
    }
  }

  private load () {
    if (this.loading()) return
    this.loading.set(true)

    this.videoService.listVideos({
      videoPagination: this.pagination,
      sort: this.sortForTab(),
      nsfw: 'false'
    }).subscribe({
      next: ({ data, total }) => {
        this.videos.update(prev => [ ...prev, ...data ])
        this.pagination.totalItems = total
        this.loading.set(false)
      },
      error: () => this.loading.set(false)
    })
  }

  getThumb (v: Video): string {
    return v?.thumbnails?.[0]?.fileUrl || ''
  }

  // Real tags from the current video (falls back to its category); no fake tags.
  tagsFor (i: number): string[] {
    const v = this.videos()[i]
    if (!v) return []

    const tags = (v.tags || []).filter(Boolean).slice(0, 2).map(t => '#' + t)
    if (tags.length > 0) return tags

    const cat = v.category?.label
    return cat ? [ '#' + cat ] : []
  }

  // Real position in the trending feed (not a fake episode number).
  epNumber (): string {
    return String(this.index() + 1)
  }

  formatCount (n: number): string {
    if (n == null) return '0'
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
  }

  openPlayer () {
    const v = this.current
    if (!v) return
    this.router.navigate([ '/m/w', v.shortUUID || v.uuid ])
  }

  openMenu () {
    this.ui.openMenu()
  }

  goSearch () {
    this.router.navigate([ '/m/discover' ])
  }

  // -- Real interactions --
  private requireAuth (): boolean {
    if (this.auth.isLoggedIn()) return true
    this.router.navigate([ '/m/login' ])
    return false
  }

  isLiked (v: Video) {
    return this.likedIds().has(v.uuid)
  }

  toggleLike (v: Video) {
    if (!this.requireAuth()) return

    const liked = this.isLiked(v)
    const obs = liked
      ? this.videoService.unsetVideoLike(v.uuid, undefined)
      : this.videoService.setVideoLike(v.uuid, undefined)

    obs.subscribe({
      next: () => {
        const s = new Set(this.likedIds())
        if (liked) { s.delete(v.uuid); v.likes = Math.max(0, (v.likes || 0) - 1) } else { s.add(v.uuid); v.likes = (v.likes || 0) + 1 }
        this.likedIds.set(s)
      },
      error: err => this.notifier.error(err.message)
    })
  }

  private channelHandle (v: Video): string {
    return v.byVideoChannel || ''
  }

  isFollowed (v: Video) {
    const h = this.channelHandle(v)
    return !!h && this.followed().has(h)
  }

  toggleFollow (v: Video) {
    if (!this.requireAuth()) return

    const handle = this.channelHandle(v)
    if (!handle) return

    const isFollowed = this.followed().has(handle)
    const obs = isFollowed
      ? this.subscriptionService.deleteSubscription(handle)
      : this.subscriptionService.addSubscription(handle)

    obs.subscribe({
      next: () => {
        const s = new Set(this.followed())
        if (isFollowed) s.delete(handle); else s.add(handle)
        this.followed.set(s)
        this.notifier.success(isFollowed ? $localize`:@@boomboom.m.feed.unfollowed:Unfollowed` : $localize`:@@boomboom.m.feed.followed:Following`)
      },
      error: err => this.notifier.error(err.message)
    })
  }

  openComments () {
    this.openPlayer()
  }

  share (v: Video) {
    const url = window.location.origin + '/m/w/' + (v.shortUUID || v.uuid)
    const nav = navigator as any

    if (nav.share) {
      nav.share({ title: v.name, url }).catch(() => {})
      return
    }
    if (nav.clipboard) {
      nav.clipboard.writeText(url)
      this.notifier.success($localize`:@@boomboom.m.feed.linkCopied:Link copied`)
    }
  }

  // -- Swipe --
  onTouchStart (e: TouchEvent) {
    this.startY = e.touches[0].clientY
    this.dragging = true
  }

  onTouchMove (e: TouchEvent) {
    if (!this.dragging) return
    this.curY = e.touches[0].clientY
  }

  onTouchEnd () {
    if (!this.dragging) return
    this.dragging = false

    const dy = this.startY - this.curY
    if (Math.abs(dy) < 70) return

    if (dy > 0) this.next()
    else this.prev()
  }

  private next () {
    const vids = this.videos()
    if (this.index() < vids.length - 1) {
      this.index.update(i => i + 1)
      if (this.index() >= vids.length - 3) {
        this.pagination.currentPage++
        this.load()
      }
    }
  }

  private prev () {
    if (this.index() > 0) this.index.update(i => i - 1)
  }
}

import { forkJoin, of } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
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
  private sanitizer = inject(DomSanitizer)
  ui = inject(MUiService)

  likedIds = signal<Set<string>>(new Set())
  followed = signal<Set<string>>(new Set())

  readonly stage = viewChild<ElementRef<HTMLElement>>('stage')

  videos = signal<Video[]>([])
  index = signal(0)
  loading = signal(false)
  activeTab = signal<FeedTab>('recommend')

  // "swipe up for more" hint on the first video
  showHint = signal(true)

  readonly descFallback = $localize`:@@boomboom.m.feed.descFallback:A must-watch drama you won't be able to stop.`

  // genre affinity (session personalization): categories the viewer engages with
  private affinityGenres = new Set<string>()
  private embedCache = new Map<string, SafeResourceUrl>()

  private startY = 0
  private curY = 0
  private dragging = false
  private startTarget: HTMLElement | null = null
  private pagination = { currentPage: 1, itemsPerPage: 10, totalItems: 0 }

  ngOnInit () {
    // show the swipe hint on the first video until the user swipes once (ever)
    try { this.showHint.set(!localStorage.getItem('bb-feed-hint-seen')) } catch { this.showHint.set(true) }
    this.load()
  }

  private dismissHint () {
    if (!this.showHint()) return
    this.showHint.set(false)
    try { localStorage.setItem('bb-feed-hint-seen', '1') } catch {}
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
      case 'ranking': return '-views' as VideoSortField
      default: return '-trending' as VideoSortField
    }
  }

  private load () {
    if (this.loading()) return
    this.loading.set(true)

    const firstPage = this.pagination.currentPage === 1
    const tab = this.activeTab()

    // Following tab = videos from channels you follow
    if (tab === 'following' && this.auth.isLoggedIn()) {
      this.subscriptionService.getUserSubscriptionVideos({ videoPagination: this.pagination, sort: '-publishedAt' as VideoSortField })
        .subscribe({
          next: ({ data, total }) => this.appendPage(data, total, false),
          error: () => this.loading.set(false)
        })
      return
    }

    // Recommend first page = blend of followed creators + trending (+ genre affinity)
    if (tab === 'recommend' && firstPage && this.auth.isLoggedIn()) {
      forkJoin({
        trending: this.videoService.listVideos({ videoPagination: this.pagination, sort: '-trending' as VideoSortField, nsfw: 'false' }),
        subs: this.subscriptionService
          .getUserSubscriptionVideos({ videoPagination: { currentPage: 1, itemsPerPage: 10, totalItems: 0 }, sort: '-publishedAt' as VideoSortField })
          .pipe(catchError(() => of({ data: [] as Video[], total: 0 })))
      }).subscribe({
        next: ({ trending, subs }) => {
          this.videos.set(this.blend(subs.data, trending.data))
          this.pagination.totalItems = trending.total
          this.loading.set(false)
        },
        error: () => this.loading.set(false)
      })
      return
    }

    // Default: append a page (shuffle recommend for variety)
    this.videoService.listVideos({ videoPagination: this.pagination, sort: this.sortForTab(), nsfw: 'false' })
      .subscribe({
        next: ({ data, total }) => this.appendPage(data, total, tab === 'recommend'),
        error: () => this.loading.set(false)
      })
  }

  private appendPage (data: Video[], total: number, shuffle: boolean) {
    const batch = shuffle ? this.shuffle([ ...data ]) : data
    this.videos.update(prev => this.dedupe([ ...prev, ...batch ]))
    this.pagination.totalItems = total
    this.loading.set(false)
  }

  // followed creators first, then genre-affinity trending, then the rest — each shuffled
  private blend (subs: Video[], trending: Video[]): Video[] {
    const seen = new Set<string>()
    const take = (arr: Video[]) => {
      const out: Video[] = []
      for (const v of arr) { if (!seen.has(v.uuid)) { seen.add(v.uuid); out.push(v) } }
      return out
    }

    const followed = take(subs)
    const rest = take(trending)

    const aff: Video[] = []
    const other: Video[] = []
    for (const v of rest) {
      if (this.affinityGenres.size && v.category?.label && this.affinityGenres.has(v.category.label)) aff.push(v)
      else other.push(v)
    }

    return [ ...this.shuffle(followed), ...this.shuffle(aff), ...this.shuffle(other) ]
  }

  private dedupe (vids: Video[]): Video[] {
    const seen = new Set<string>()
    const out: Video[] = []
    for (const v of vids) { if (!seen.has(v.uuid)) { seen.add(v.uuid); out.push(v) } }
    return out
  }

  private shuffle<T> (a: T[]): T[] {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[ a[i], a[j] ] = [ a[j], a[i] ]
    }
    return a
  }

  // -- Windowed slides: render current ±1 so the neighbour is preloaded (no reload on swipe) --
  windowVideos (): { v: Video, i: number }[] {
    const vids = this.videos()
    const idx = this.index()
    const out: { v: Video, i: number }[] = []
    for (let i = Math.max(0, idx - 1); i <= Math.min(vids.length - 1, idx + 1); i++) {
      out.push({ v: vids[i], i })
    }
    return out
  }

  slideEmbed (v: Video): SafeResourceUrl {
    const cached = this.embedCache.get(v.uuid)
    if (cached) return cached

    const base = v.embedUrl || (window.location.origin + v.embedPath)
    const sep = base.includes('?') ? '&' : '?'
    const url = base + sep + 'autoplay=1&muted=1&loop=1&controls=0&title=0&warningTitle=0&peertubeLink=0&p2p=0'
    const safe = this.sanitizer.bypassSecurityTrustResourceUrl(url)
    this.embedCache.set(v.uuid, safe)
    return safe
  }

  getThumb (v: Video): string {
    return v?.thumbnails?.[0]?.fileUrl || ''
  }

  tagsFor (i: number): string[] {
    const v = this.videos()[i]
    if (!v) return []

    const tags = (v.tags || []).filter(Boolean).slice(0, 2).map(t => '#' + t)
    if (tags.length > 0) return tags

    const cat = v.category?.label
    return cat ? [ '#' + cat ] : []
  }

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
        if (liked) { s.delete(v.uuid); v.likes = Math.max(0, (v.likes || 0) - 1) } else {
          s.add(v.uuid)
          v.likes = (v.likes || 0) + 1
          // learn genre affinity from likes -> personalizes future recommend loads
          if (v.category?.label) this.affinityGenres.add(v.category.label)
        }
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

  // -- Swipe + tap-to-enter --
  onTouchStart (e: TouchEvent) {
    this.startY = e.touches[0].clientY
    this.curY = this.startY
    this.startTarget = e.target as HTMLElement
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

    if (Math.abs(dy) < 70) {
      if (!this.startTarget?.closest('button, a, input')) this.openPlayer()
      return
    }

    if (dy > 0) this.next()
    else this.prev()
  }

  private next () {
    this.dismissHint()
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
    this.dismissHint()
    if (this.index() > 0) this.index.update(i => i - 1)
  }
}

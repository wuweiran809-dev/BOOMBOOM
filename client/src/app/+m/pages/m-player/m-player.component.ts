import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthService, Notifier } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { Video } from '@app/shared/shared-main/video/video.model'
import { VideoDetails } from '@app/shared/shared-main/video/video-details.model'
import { VideoService } from '@app/shared/shared-main/video/video.service'
import { VideoSortField } from '@boomboom/boomboom-models'
import { Danmaku, MDanmakuService } from '../../m-danmaku.service'
import { MWalletService } from '../../m-wallet.service'

interface ActiveDanmaku {
  key: number
  message: string
  color: string
  lane: number
}

const DANMAKU_LANES = 4
const DANMAKU_DURATION_MS = 7000

@Component({
  selector: 'm-player',
  templateUrl: './m-player.component.html',
  styleUrls: [ './m-player.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ MWalletService, MDanmakuService ],
  imports: [ GlobalIconComponent, FormsModule ]
})
export class MPlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute)
  private router = inject(Router)
  private videoService = inject(VideoService)
  private sanitizer = inject(DomSanitizer)
  private wallet = inject(MWalletService)
  private auth = inject(AuthService)
  private notifier = inject(Notifier)
  private danmakuService = inject(MDanmakuService)

  video = signal<VideoDetails | null>(null)
  episodes = signal<Video[]>([])
  embedUrl = signal<SafeResourceUrl | null>(null)

  // Paid unlock state (real)
  unlocked = signal(true)
  coinPrice = signal(0)
  purchasing = signal(false)

  // Danmaku (real, synced to a play clock)
  danmakuOn = signal(true)
  danmakuInput = ''
  activeDanmaku = signal<ActiveDanmaku[]>([])

  private danmakuAll: Danmaku[] = []
  private spawnIdx = 0
  private clockStart = 0
  private rafId: number | null = null
  private danmakuKey = 0
  private laneCounter = 0

  readonly nowPlayingLabel = $localize`:@@boomboom.m.player.nowPlaying:Now Playing`

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  get isVip (): boolean {
    const exp = (this.auth.getUser() as any)?.vipExpiration
    return exp ? new Date(exp).getTime() > Date.now() : false
  }

  ngOnInit () {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id')
      if (id) this.loadVideo(id)
    })
  }

  ngOnDestroy () {
    this.stopClock()
  }

  private loadVideo (id: string) {
    // reset state for the new video
    this.embedUrl.set(null)
    this.unlocked.set(true)
    this.resetDanmaku()

    this.videoService.getVideo({ videoId: id }).subscribe({
      next: v => {
        this.video.set(v)
        this.coinPrice.set(v.coinPrice || 0)
        this.loadEpisodes(v)
        this.resolveAccess(v)
      }
    })
  }

  // Load the real episodes: only videos of the SAME drama (same seriesName),
  // in publish order. A standalone video (no seriesName) shows only itself,
  // so different dramas never mix into one episode strip.
  private loadEpisodes (v: VideoDetails) {
    const series = (v as any).seriesName
    const handle = v.channel?.nameWithHost || v.byVideoChannel

    if (!series || !handle) {
      this.episodes.set([ v ])
      return
    }

    this.videoService.listChannelVideos({
      videoChannel: { nameWithHost: handle },
      videoPagination: { currentPage: 1, itemsPerPage: 100, totalItems: 0 },
      sort: 'publishedAt' as VideoSortField
    }).subscribe({
      next: ({ data }) => {
        const eps = (data || []).filter(ep => (ep as any).seriesName === series)
        this.episodes.set(eps.length ? eps : [ v ])
      },
      error: () => this.episodes.set([ v ])
    })
  }

  // Decide whether to play immediately or show the paywall.
  private resolveAccess (v: VideoDetails) {
    const price = v.coinPrice || 0

    if (price <= 0) {
      this.startPlayback(v)
      return
    }

    if (!this.isLoggedIn) {
      this.unlocked.set(false)
      return
    }

    this.wallet.getPurchaseStatus(v.id).subscribe({
      next: res => {
        this.unlocked.set(res.unlocked)
        if (res.unlocked) this.startPlayback(v)
      },
      error: () => this.unlocked.set(false)
    })
  }

  private startPlayback (v: VideoDetails) {
    this.unlocked.set(true)
    const base = v.embedUrl
    const url = base + (base.includes('?') ? '&' : '?') + 'autoplay=1&title=0&warningTitle=0&p2p=0'
    this.embedUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url))
    this.startDanmaku(v)
  }

  unlockNow () {
    const v = this.video()
    if (!v || this.purchasing()) return

    if (!this.isLoggedIn) {
      this.router.navigate([ '/m/login' ])
      return
    }

    this.purchasing.set(true)
    this.wallet.purchaseVideo(v.id).subscribe({
      next: () => {
        this.auth.refreshUserInformation()
        this.startPlayback(v)
        this.notifier.success($localize`:@@boomboom.m.player.unlocked:Unlocked · enjoy!`)
        this.purchasing.set(false)
      },
      error: () => {
        this.notifier.error($localize`:@@boomboom.m.player.notEnough:Not enough coins — top up first`)
        this.purchasing.set(false)
      }
    })
  }

  getVip () {
    this.router.navigate([ '/m/recharge' ])
  }

  // Videos generated on 短剧工坊 show an ad-style promo that drives viewers to
  // the platform (referral funnel, with source attribution).
  get isDuanju (): boolean {
    return (this.video() as any)?.externalSource === 'duanju'
  }

  openDuanjuPromo () {
    const ref = String(this.auth.getUser()?.id ?? '')
    const params = new URLSearchParams({ utm_source: 'boomboom', utm_medium: 'player', utm_campaign: 'drama', ref })
    window.open(`https://ai.xss16.com/?${params.toString()}`, '_blank', 'noopener')
  }

  // ---------------------------------------------------------------------------
  // Danmaku
  // ---------------------------------------------------------------------------

  private resetDanmaku () {
    this.stopClock()
    this.danmakuAll = []
    this.spawnIdx = 0
    this.activeDanmaku.set([])
  }

  private startDanmaku (v: VideoDetails) {
    this.danmakuService.list(v.id).subscribe({
      next: ({ data }) => { this.danmakuAll = (data || []).sort((a, b) => a.time - b.time) }
    })

    this.clockStart = performance.now()
    this.spawnIdx = 0
    this.loop()
  }

  private loop = () => {
    const elapsed = (performance.now() - this.clockStart) / 1000

    if (this.danmakuOn()) {
      while (this.spawnIdx < this.danmakuAll.length && this.danmakuAll[this.spawnIdx].time <= elapsed) {
        this.spawn(this.danmakuAll[this.spawnIdx])
        this.spawnIdx++
      }
    } else {
      // keep the pointer advancing while hidden so we don't dump a backlog on re-enable
      while (this.spawnIdx < this.danmakuAll.length && this.danmakuAll[this.spawnIdx].time <= elapsed) {
        this.spawnIdx++
      }
    }

    this.rafId = requestAnimationFrame(this.loop)
  }

  private stopClock () {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private spawn (d: Danmaku) {
    const key = ++this.danmakuKey
    const lane = (this.laneCounter++) % DANMAKU_LANES
    this.activeDanmaku.update(list => [ ...list, { key, message: d.message, color: d.color || '#ffffff', lane } ])

    setTimeout(() => {
      this.activeDanmaku.update(list => list.filter(x => x.key !== key))
    }, DANMAKU_DURATION_MS)
  }

  private currentTime (): number {
    return this.clockStart ? Math.max(0, (performance.now() - this.clockStart) / 1000) : 0
  }

  toggleDanmaku () {
    this.danmakuOn.set(!this.danmakuOn())
    if (!this.danmakuOn()) this.activeDanmaku.set([])
  }

  sendDanmaku () {
    const v = this.video()
    const message = this.danmakuInput.trim().slice(0, 100)
    if (!v || !message) return

    if (!this.isLoggedIn) {
      this.router.navigate([ '/m/login' ])
      return
    }

    const payload: Danmaku = { message, time: this.currentTime(), color: '#FFD166' }

    // optimistic: show my danmaku immediately
    if (this.danmakuOn()) this.spawn(payload)
    this.danmakuInput = ''

    this.danmakuService.send(v.id, payload).subscribe({
      error: () => this.notifier.error($localize`:@@boomboom.m.player.danmakuFail:Failed to send`)
    })
  }

  // ---------------------------------------------------------------------------

  posterUrl (): string {
    const v = this.video()
    const t = v?.thumbnails
    return t && t.length > 0 ? t[0].fileUrl : ''
  }

  back () {
    this.router.navigate([ '/m/feed' ])
  }

  openEpisode (ep: Video) {
    if (this.isCurrent(ep)) return
    this.router.navigate([ '/m/w', ep.shortUUID || ep.uuid ])
  }

  isCurrent (ep: Video) {
    const v = this.video()
    return !!v && ep?.uuid === v.uuid
  }

  // An episode shows a lock when it's paid and the viewer isn't a VIP.
  epLocked (ep: Video) {
    return (ep?.coinPrice || 0) > 0 && !this.isVip && !this.isCurrent(ep)
  }

  epNum (i: number) {
    return String(i + 1).padStart(2, '0')
  }

  // The episode number of the video currently playing (for the header).
  currentEpNum (): string {
    const v = this.video()
    const eps = this.episodes()
    const idx = v ? eps.findIndex(e => e.uuid === v.uuid) : -1
    return String((idx >= 0 ? idx : 0) + 1).padStart(2, '0')
  }
}

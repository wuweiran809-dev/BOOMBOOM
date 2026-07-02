import { Component, ElementRef, OnInit, OnDestroy, inject, viewChild, signal } from '@angular/core'
import { NgClass } from '@angular/common'
import { Router, RouterLink } from '@angular/router'
import { AuthService, MenuService, ScreenService, ServerService } from '@app/core'
import { VideoService } from '@app/shared/shared-main/video/video.service'
import { Video } from '@app/shared/shared-main/video/video.model'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { VideoSortField } from '@boomboom/boomboom-models'

type FeedTab = 'following' | 'recommend' | 'ranking'

@Component({
  selector: 'my-video-feed',
  templateUrl: './video-feed.component.html',
  styleUrls: [ './video-feed.component.scss' ],
  imports: [ NgClass, GlobalIconComponent, RouterLink ]
})
export class VideoFeedComponent implements OnInit, OnDestroy {
  private videoService = inject(VideoService)
  private auth = inject(AuthService)
  private router = inject(Router)
  private menuService = inject(MenuService)

  readonly feedContainer = viewChild<ElementRef<HTMLElement>>('feedContainer')

  videos = signal<Video[]>([])
  currentIndex = signal(0)
  loading = signal(false)
  activeTab = signal<FeedTab>('recommend')

  private startY = 0
  private currentY = 0
  private isDragging = false
  private pagination = { currentPage: 1, itemsPerPage: 10, totalItems: 0 }

  ngOnInit () {
    this.loadVideos()
  }

  ngOnDestroy () {}

  setTab (tab: FeedTab) {
    if (this.activeTab() === tab) return
    this.activeTab.set(tab)
    this.videos.set([])
    this.currentIndex.set(0)
    this.pagination.currentPage = 1
    this.loadVideos()
  }

  private getSortForTab (): VideoSortField {
    switch (this.activeTab()) {
      case 'ranking': return '-trending' as VideoSortField
      case 'following': return '-publishedAt' as VideoSortField
      default: return '-trending' as VideoSortField
    }
  }

  private loadVideos () {
    if (this.loading()) return
    this.loading.set(true)

    this.videoService.listVideos({
      videoPagination: this.pagination,
      sort: this.getSortForTab(),
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

  get currentVideo (): Video | undefined {
    return this.videos()[this.currentIndex()]
  }

  formatCount (n: number): string {
    if (n == null) return '0'
    if (n >= 10000) return (n / 10000).toFixed(1) + '万'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return String(n)
  }

  onTouchStart (event: TouchEvent) {
    this.startY = event.touches[0].clientY
    this.isDragging = true
  }

  onTouchMove (event: TouchEvent) {
    if (!this.isDragging) return
    this.currentY = event.touches[0].clientY
    event.preventDefault()
  }

  onTouchEnd () {
    if (!this.isDragging) return
    this.isDragging = false

    const deltaY = this.startY - this.currentY
    const threshold = 80

    if (Math.abs(deltaY) < threshold) return

    if (deltaY > 0) {
      this.goNext()
    } else {
      this.goPrev()
    }
  }

  goNext () {
    const videos = this.videos()
    if (this.currentIndex() < videos.length - 1) {
      this.currentIndex.update(i => i + 1)

      if (this.currentIndex() >= videos.length - 3) {
        this.pagination.currentPage++
        this.loadVideos()
      }
    }
  }

  goPrev () {
    if (this.currentIndex() > 0) {
      this.currentIndex.update(i => i - 1)
    }
  }

  toggleMenu () {
    this.menuService.toggleMenu()
  }

  onVideoClick (video: Video) {
    this.router.navigate([ '/w', video.uuid ])
  }

  getVideoThumbnailUrl (video: Video): string {
    return video.thumbnailUrl || ''
  }

  isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  trackByIndex (index: number) {
    return index
  }
}

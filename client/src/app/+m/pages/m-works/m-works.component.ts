import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { AuthService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { Video } from '@app/shared/shared-main/video/video.model'
import { VideoService } from '@app/shared/shared-main/video/video.service'
import { VideoSortField } from '@boomboom/boomboom-models'

interface DramaGroup {
  series: string
  episodes: Video[]
}

// 我的作品 — the user's own uploads, grouped by drama (seriesName). Preview an
// episode, or "续集" to add the next episode to an existing drama.
@Component({
  selector: 'm-works',
  templateUrl: './m-works.component.html',
  styleUrls: [ './m-works.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ GlobalIconComponent, RouterLink ]
})
export class MWorksComponent implements OnInit {
  private videoService = inject(VideoService)
  private auth = inject(AuthService)
  private router = inject(Router)

  loading = signal(true)
  groups = signal<DramaGroup[]>([])

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  ngOnInit () {
    if (!this.isLoggedIn) {
      this.loading.set(false)
      return
    }

    this.videoService.listMyVideos({
      videoPagination: { currentPage: 1, itemsPerPage: 100, totalItems: 0 },
      sort: '-publishedAt' as VideoSortField,
      channelNameOneOf: []
    }).subscribe({
      next: ({ data }) => {
        this.groups.set(this.group(data || []))
        this.loading.set(false)
      },
      error: () => this.loading.set(false)
    })
  }

  private group (videos: Video[]): DramaGroup[] {
    const map = new Map<string, Video[]>()
    for (const v of videos) {
      const key = (v as any).seriesName || v.name
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(v)
    }

    const groups: DramaGroup[] = []
    for (const [ series, eps ] of map) {
      eps.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime())
      groups.push({ series, episodes: eps })
    }
    return groups
  }

  thumb (v: Video): string {
    const t = v?.thumbnails
    return t && t.length > 0 ? t[0].fileUrl : ''
  }

  epNum (i: number) {
    return String(i + 1).padStart(2, '0')
  }

  open (v: Video) {
    this.router.navigate([ '/m/w', v.shortUUID || v.uuid ])
  }

  // "续集" — open the uploader pre-filled with this drama's series name,
  // so the new video becomes the next episode.
  continueSeries (g: DramaGroup) {
    this.router.navigate([ '/m/upload' ], { queryParams: { series: g.series } })
  }

  newWork () {
    this.router.navigate([ '/m/upload' ])
  }

  back () {
    this.router.navigate([ '/m/me' ])
  }
}

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router } from '@angular/router'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { Video } from '@app/shared/shared-main/video/video.model'
import { VideoService } from '@app/shared/shared-main/video/video.service'
import { VideoSortField } from '@boomboom/boomboom-models'
import { MUiService } from '../../m-ui.service'

interface Genre {
  label: string
  tag?: string // real tag key used to filter; undefined = no filter (recommended)
}

@Component({
  selector: 'm-discover',
  templateUrl: './m-discover.component.html',
  styleUrls: [ './m-discover.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ GlobalIconComponent, FormsModule ]
})
export class MDiscoverComponent implements OnInit {
  private videoService = inject(VideoService)
  private router = inject(Router)
  ui = inject(MUiService)

  videos = signal<Video[]>([])
  searchText = ''

  readonly genres: Genre[] = [
    { label: $localize`:@@boomboom.m.discover.genre.recommend:For You` },
    { label: $localize`:@@boomboom.m.discover.genre.urban:Urban`, tag: 'urban' },
    { label: $localize`:@@boomboom.m.discover.genre.romance:Romance`, tag: 'romance' },
    { label: $localize`:@@boomboom.m.discover.genre.period:Period`, tag: 'period' },
    { label: $localize`:@@boomboom.m.discover.genre.underdog:Underdog`, tag: 'underdog' },
    { label: $localize`:@@boomboom.m.discover.genre.mystery:Mystery`, tag: 'mystery' }
  ]

  activeGenre = signal<Genre>(this.genres[0])

  ngOnInit () {
    this.load()
  }

  get ranking (): Video[] {
    return this.videos().slice(0, 5)
  }

  get grid (): Video[] {
    return this.videos()
  }

  selectGenre (g: Genre) {
    if (this.activeGenre() === g) return
    this.activeGenre.set(g)
    this.load()
  }

  private load () {
    const tag = this.activeGenre().tag
    const search = this.searchText?.trim()

    this.videoService.listVideos({
      videoPagination: { currentPage: 1, itemsPerPage: 14, totalItems: 0 },
      sort: '-trending' as VideoSortField,
      nsfw: 'false',
      ...(tag ? { tagsOneOf: [ tag ] } : {}),
      ...(search ? { search } : {})
    }).subscribe({ next: ({ data }) => this.videos.set(data) })
  }

  openMenu () {
    this.ui.openMenu()
  }

  // Inline search within Discover (no jump to the old /search page).
  doSearch () {
    this.load()
  }

  // Real poster thumbnail (thumbnailUrl on the model is typed `never`).
  thumb (v: Video): string {
    return v?.thumbnails?.[0]?.fileUrl || ''
  }

  openVideo (v: Video) {
    this.router.navigate([ '/m/w', v.shortUUID || v.uuid ])
  }

  // Real category label for a video, if any.
  categoryLabel (v: Video): string {
    return v?.category?.label || ''
  }

  // Real channel/account name for a video.
  channelName (v: Video): string {
    return v?.channel?.displayName || v?.byAccount || ''
  }

  formatHot (n: number): string {
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
    return String(n || 0)
  }
}

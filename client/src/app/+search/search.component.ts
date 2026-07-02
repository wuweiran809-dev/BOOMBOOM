import { NgClass, NgTemplateOutlet } from '@angular/common'
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { AuthService, HooksService, MenuService, MetaService, Notifier, ScreenService, ServerService, User, UserService } from '@app/core'
import { immutableAssign, SimpleMemoize } from '@app/helpers'
import { validateHost } from '@app/shared/form-validators/host-validators'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { VideoChannel } from '@app/shared/shared-main/channel/video-channel.model'
import { AlertComponent } from '@app/shared/shared-main/common/alert.component'
import { Video } from '@app/shared/shared-main/video/video.model'
import { VideoService } from '@app/shared/shared-main/video/video.service'
import { AdvancedSearch } from '@app/shared/shared-search/advanced-search.model'
import { SearchService } from '@app/shared/shared-search/search.service'
import { VideoPlaylist } from '@app/shared/shared-video-playlist/video-playlist.model'
import { NgbCollapse } from '@ng-bootstrap/ng-bootstrap'
import { HTMLServerConfig, SearchTargetType, VideoSortField } from '@boomboom/boomboom-models'
import { LinkType } from '@pt-types'
import { forkJoin, Subject, Subscription } from 'rxjs'
import { ActorAvatarComponent } from '../shared/shared-actor-image/actor-avatar.component'
import { InfiniteScrollerDirective } from '../shared/shared-main/common/infinite-scroller.directive'
import { NumberFormatterPipe } from '../shared/shared-main/common/number-formatter.pipe'
import { SubscribeButtonComponent } from '../shared/shared-user-subscription/subscribe-button.component'
import { MiniatureDisplayOptions, VideoMiniatureComponent } from '../shared/shared-video-miniature/video-miniature.component'
import { VideoPlaylistMiniatureComponent } from '../shared/shared-video-playlist/video-playlist-miniature.component'
import { SearchFiltersComponent } from './search-filters.component'

@Component({
  selector: 'my-search',
  styleUrls: [ './search.component.scss' ],
  templateUrl: './search.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    InfiniteScrollerDirective,
    NgbCollapse,
    NgClass,
    SearchFiltersComponent,
    ActorAvatarComponent,
    RouterLink,
    NgTemplateOutlet,
    SubscribeButtonComponent,
    VideoMiniatureComponent,
    VideoPlaylistMiniatureComponent,
    NumberFormatterPipe,
    AlertComponent,
    GlobalIconComponent
  ]
})
export class SearchComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute)
  router = inject(Router)
  private metaService = inject(MetaService)
  private notifier = inject(Notifier)
  private searchService = inject(SearchService)
  private authService = inject(AuthService)
  private userService = inject(UserService)
  private hooks = inject(HooksService)
  private serverService = inject(ServerService)
  private videoService = inject(VideoService)
  private screenService = inject(ScreenService)
  private menuService = inject(MenuService)

  error: string

  results: (Video | VideoChannel | VideoPlaylist)[] = []

  pagination = {
    currentPage: 1,
    totalItems: null as number
  }
  deletedVideos = 0

  advancedSearch: AdvancedSearch = new AdvancedSearch()
  isSearchFilterCollapsed = true
  currentSearch: string

  videoDisplayOptions: MiniatureDisplayOptions = {
    date: true,
    views: true,
    by: true,
    avatar: true,
    privacyLabel: false
  }

  errorMessage: string

  userMiniature: User

  onSearchDataSubject = new Subject<any>()

  discoverVideos = signal<Video[]>([])
  activeGenre = signal('推荐')
  readonly genreChips = [ '推荐', '都市', '甜宠', '古装', '逆袭', '悬疑' ]

  get isMobileDiscover (): boolean {
    return this.screenService.isInMobileView() && !this.currentSearch
  }

  private subActivatedRoute: Subscription
  private isInitialLoad = false // set to false to show the search filters on first arrival

  private hasMoreResults = true
  private isSearching = false

  private lastSearchTarget: SearchTargetType

  private serverConfig: HTMLServerConfig

  ngOnInit () {
    this.serverConfig = this.serverService.getHTMLConfig()

    this.subActivatedRoute = this.route.queryParams
      .subscribe({
        next: queryParams => {
          const querySearch = queryParams['search']
          const searchTarget = queryParams['searchTarget']

          // Search updated, reset filters
          if (this.currentSearch !== querySearch || searchTarget !== this.advancedSearch.searchTarget) {
            this.resetPagination()
            this.advancedSearch.reset()

            this.currentSearch = querySearch || undefined
            this.updateTitle()
          }

          this.advancedSearch = new AdvancedSearch(queryParams)
          if (!this.advancedSearch.searchTarget) {
            this.advancedSearch.searchTarget = this.getDefaultSearchTarget()
          }

          this.error = this.checkFieldsAndGetError()

          // Don't hide filters if we have some of them AND the user just came on the webpage, or we have an error
          this.isSearchFilterCollapsed = !this.error && (this.isInitialLoad === false || !this.advancedSearch.containsValues())
          this.isInitialLoad = false

          this.search()
        },

        error: err => this.notifier.handleError(err)
      })

    this.userService.getAnonymousOrLoggedUser()
      .subscribe(user => this.userMiniature = user)

    this.hooks.runAction('action:search.init', 'search')

    this.loadDiscoverVideos()
  }

  selectGenre (genre: string) {
    this.activeGenre.set(genre)
  }

  onVideoClick (video: Video) {
    this.router.navigate([ '/w', video.uuid ])
  }

  toggleMenu () {
    this.menuService.toggleMenu()
  }

  doMobileSearch (value: string) {
    if (!value?.trim()) return
    this.router.navigate([ '/search' ], { queryParams: { search: value.trim() } })
  }

  private readonly rankTags = [ '爆', '热', '独播', '新', '荐' ]

  getRankTag (index: number): string {
    return this.rankTags[index % this.rankTags.length]
  }

  getRankTagClass (index: number): string {
    const classes = [ 'tag-hot', 'tag-fire', 'tag-exclusive', 'tag-new', 'tag-rec' ]
    return classes[index % classes.length]
  }

  formatHot (views: number): string {
    if (views >= 100000000) return (views / 100000000).toFixed(1) + '亿'
    if (views >= 10000) return (views / 10000).toFixed(1) + '万'
    return String(views || 0)
  }

  private readonly genreTags = [ '甜宠', '都市', '逆袭', '古装', '悬疑', '热血' ]

  getGenreTag (index: number): string {
    return this.genreTags[index % this.genreTags.length]
  }

  getEpsLabel (video: Video): string {
    return '更新至12集'
  }

  private loadDiscoverVideos () {
    this.videoService.listVideos({
      videoPagination: { currentPage: 1, itemsPerPage: 12, totalItems: 0 },
      sort: '-trending' as VideoSortField,
      nsfw: 'false'
    }).subscribe({
      next: ({ data }) => this.discoverVideos.set(data)
    })
  }

  ngOnDestroy () {
    if (this.subActivatedRoute) this.subActivatedRoute.unsubscribe()
  }

  isVideoChannel (d: VideoChannel | Video | VideoPlaylist): d is VideoChannel {
    return d instanceof VideoChannel
  }

  isVideo (v: VideoChannel | Video | VideoPlaylist): v is Video {
    return v instanceof Video
  }

  isPlaylist (v: VideoChannel | Video | VideoPlaylist): v is VideoPlaylist {
    return v instanceof VideoPlaylist
  }

  isUserLoggedIn () {
    return this.authService.isLoggedIn()
  }

  search () {
    this.error = this.checkFieldsAndGetError()
    if (this.error) return

    this.isSearching = true

    forkJoin([
      this.getVideoChannelObs(),
      this.getVideoPlaylistObs(),
      this.getVideosObs()
    ]).subscribe({
      next: results => {
        for (const result of results) {
          this.results = this.results.concat(result.data)
        }

        this.pagination.totalItems = results.reduce((p, r) => p + r.total, 0)
        this.lastSearchTarget = this.advancedSearch.searchTarget

        this.hasMoreResults = this.results.length < this.pagination.totalItems

        this.onSearchDataSubject.next(results)
      },

      error: err => {
        if (this.advancedSearch.searchTarget !== 'search-index') {
          this.notifier.error(err.message)
          return
        }

        this.notifier.error(
          $localize`Search index is unavailable. Retrying with local platform results instead.`,
          $localize`Search error`
        )
        this.advancedSearch.searchTarget = 'local'
        this.search()
      },

      complete: () => {
        this.isSearching = false
      }
    })
  }

  onNearOfBottom () {
    // Last page
    if (!this.hasMoreResults || this.isSearching) return

    this.pagination.currentPage += 1
    this.search()
  }

  onFiltered () {
    this.resetPagination()

    this.updateUrlFromAdvancedSearch()
  }

  numberOfFilters () {
    return this.advancedSearch.size()
  }

  // Add VideoChannel/VideoPlaylist for typings, but the template already checks "video" argument is a video
  removeVideoFromArray (video: Video | VideoChannel | VideoPlaylist) {
    const previous = this.results
    this.results = this.results.filter(r => !this.isVideo(r) || r.id !== video.id)

    if (previous.length !== this.results.length) this.deletedVideos++
  }

  getLinkType (): LinkType {
    if (this.advancedSearch.searchTarget === 'search-index') {
      const remoteUriConfig = this.serverConfig.search.remoteUri

      // Redirect on the external instance if not allowed to fetch remote data
      if ((!this.isUserLoggedIn() && !remoteUriConfig.anonymous) || !remoteUriConfig.users) {
        return 'external'
      }

      return 'lazy-load'
    }

    return 'internal'
  }

  isExternalChannelUrl () {
    return this.getLinkType() === 'external'
  }

  getExternalChannelUrl (channel: VideoChannel) {
    // Same algorithm than videos
    if (this.getLinkType() === 'external') {
      return channel.url
    }

    // lazy-load or internal
    return undefined
  }

  @SimpleMemoize()
  getInternalChannelUrl (channel: VideoChannel) {
    const linkType = this.getLinkType()

    if (linkType === 'internal') {
      return [ '/c', channel.nameWithHost ]
    }

    if (linkType === 'lazy-load') {
      return [ '/search/lazy-load-channel', { url: channel.url } ]
    }

    // external
    return undefined
  }

  hideActions () {
    return this.lastSearchTarget === 'search-index'
  }

  getFilterButtonTitle () {
    return $localize`${this.numberOfFilters()} active filters, open the filters panel`
  }

  private resetPagination () {
    this.pagination.currentPage = 1
    this.pagination.totalItems = null
    this.deletedVideos = 0

    this.results = []
  }

  private updateTitle () {
    const title = this.currentSearch
      ? $localize`Search ${this.currentSearch}`
      : $localize`Search`

    this.metaService.setTitle(title)
  }

  private updateUrlFromAdvancedSearch () {
    const search = this.currentSearch || undefined

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.assign({}, this.advancedSearch.toUrlObject(), { search })
    })
  }

  private getVideosObs () {
    const params = {
      search: this.currentSearch,
      componentPagination: immutableAssign(this.pagination, { itemsPerPage: 10, itemsRemoved: this.deletedVideos }),
      advancedSearch: this.advancedSearch
    }

    return this.hooks.wrapObsFun(
      this.searchService.searchVideos.bind(this.searchService),
      params,
      'search',
      'filter:api.search.videos.list.params',
      'filter:api.search.videos.list.result'
    )
  }

  private getVideoChannelObs () {
    const params = {
      search: this.currentSearch,
      componentPagination: immutableAssign(this.pagination, { itemsPerPage: this.buildChannelsPerPage() }),
      advancedSearch: this.advancedSearch
    }

    return this.hooks.wrapObsFun(
      this.searchService.searchVideoChannels.bind(this.searchService),
      params,
      'search',
      'filter:api.search.video-channels.list.params',
      'filter:api.search.video-channels.list.result'
    )
  }

  private getVideoPlaylistObs () {
    const params = {
      search: this.currentSearch,
      componentPagination: immutableAssign(this.pagination, { itemsPerPage: this.buildPlaylistsPerPage() }),
      advancedSearch: this.advancedSearch
    }

    return this.hooks.wrapObsFun(
      this.searchService.searchVideoPlaylists.bind(this.searchService),
      params,
      'search',
      'filter:api.search.video-playlists.list.params',
      'filter:api.search.video-playlists.list.result'
    )
  }

  private getDefaultSearchTarget (): SearchTargetType {
    const searchIndexConfig = this.serverConfig.search.searchIndex

    if (searchIndexConfig.enabled && (searchIndexConfig.isDefaultSearch || searchIndexConfig.disableLocalSearch)) {
      return 'search-index'
    }

    return 'local'
  }

  private checkFieldsAndGetError () {
    if (this.advancedSearch.host && !validateHost(this.advancedSearch.host)) {
      return $localize`Host filter is invalid`
    }

    return undefined
  }

  private buildChannelsPerPage () {
    if (this.advancedSearch.resultType === 'channels') return 10

    return 2
  }

  private buildPlaylistsPerPage () {
    if (this.advancedSearch.resultType === 'playlists') return 10

    return 2
  }
}

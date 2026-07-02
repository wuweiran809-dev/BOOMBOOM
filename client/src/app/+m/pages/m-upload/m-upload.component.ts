import { HttpClient, HttpEventType } from '@angular/common/http'
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { AuthService, Notifier } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { environment } from '../../../../environments/environment'

@Component({
  selector: 'm-upload',
  templateUrl: './m-upload.component.html',
  styleUrls: [ './m-upload.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ FormsModule, GlobalIconComponent ]
})
export class MUploadComponent implements OnInit {
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  private http = inject(HttpClient)
  private auth = inject(AuthService)
  private notifier = inject(Notifier)

  ngOnInit () {
    // "续集" flow: pre-fill the series so the new video joins that drama
    const series = this.route.snapshot.queryParamMap.get('series')
    if (series) this.seriesName = series
  }

  title = ''
  desc = ''
  seriesName = ''
  paidUnlock = signal(false)
  coinPrice = 50

  videoFile = signal<File | null>(null)
  coverFile = signal<File | null>(null)
  coverPreview = signal<string>('')

  uploading = signal(false)
  progress = signal(0)

  readonly genres = [
    $localize`:@@boomboom.m.upload.genre.0:Urban`,
    $localize`:@@boomboom.m.upload.genre.1:Romance`,
    $localize`:@@boomboom.m.upload.genre.2:Underdog`,
    $localize`:@@boomboom.m.upload.genre.3:Period`,
    $localize`:@@boomboom.m.upload.genre.4:Mystery`
  ]

  selectedGenre = signal(this.genres[0])

  private get channelId (): number | null {
    const chans = (this.auth.getUser() as any)?.videoChannels
    return chans && chans.length ? chans[0].id : null
  }

  get videoName (): string {
    return this.videoFile()?.name || ''
  }

  cancel () {
    this.router.navigate([ '/m/feed' ])
  }

  selectGenre (g: string) {
    this.selectedGenre.set(g)
  }

  togglePaid () {
    this.paidUnlock.update(v => !v)
  }

  onVideoPicked (event: Event) {
    const input = event.target as HTMLInputElement
    const f = input.files?.[0]
    if (f) this.videoFile.set(f)
    input.value = ''
  }

  onCoverPicked (event: Event) {
    const input = event.target as HTMLInputElement
    const f = input.files?.[0]
    if (f) {
      this.coverFile.set(f)
      this.coverPreview.set(URL.createObjectURL(f))
    }
    input.value = ''
  }

  publish () {
    if (this.uploading()) return

    if (!this.auth.isLoggedIn()) {
      this.router.navigate([ '/m/login' ])
      return
    }

    const file = this.videoFile()
    const name = this.title.trim()
    const chId = this.channelId

    if (!file) { this.notifier.error($localize`:@@boomboom.m.upload.needVideo:Pick a video first`); return }
    if (!name) { this.notifier.error($localize`:@@boomboom.m.upload.needTitle:Add a title first`); return }
    if (!chId) { this.notifier.error($localize`:@@boomboom.m.upload.noChannel:No channel available`); return }

    const fd = new FormData()
    fd.append('videofile', file, file.name)
    fd.append('channelId', String(chId))
    fd.append('name', name)
    fd.append('privacy', '1')
    if (this.desc.trim()) fd.append('description', this.desc.trim())
    if (this.coverFile()) fd.append('thumbnailfile', this.coverFile(), this.coverFile().name)

    this.uploading.set(true)
    this.progress.set(0)

    this.http.post(`${environment.apiUrl}/api/v1/videos/upload`, fd, { reportProgress: true, observe: 'events' })
      .subscribe({
        next: ev => {
          if (ev.type === HttpEventType.UploadProgress && ev.total) {
            this.progress.set(Math.round((ev.loaded / ev.total) * 100))
          } else if (ev.type === HttpEventType.Response) {
            this.afterUpload((ev.body as any)?.video)
          }
        },
        error: () => {
          this.notifier.error($localize`:@@boomboom.m.upload.failed:Publish failed, please try again`)
          this.uploading.set(false)
        }
      })
  }

  private afterUpload (video: any) {
    const id = video?.id
    const finish = () => {
      this.uploading.set(false)
      this.notifier.success($localize`:@@boomboom.m.upload.published:Published!`)
      if (video?.shortUUID || video?.uuid) this.router.navigate([ '/m/w', video.shortUUID || video.uuid ])
      else this.router.navigate([ '/m/me' ])
    }

    // tag the drama/series (so episodes group together), then finish.
    // Default to the title so every work is its own series and can be continued.
    const setSeries = () => {
      const s = this.seriesName.trim() || this.title.trim()
      if (id && s) {
        this.http.put(`${environment.apiUrl}/api/v1/users/me/videos/${id}/series`, { seriesName: s })
          .subscribe({ next: finish, error: finish })
      } else {
        finish()
      }
    }

    // set the paid-unlock price on the freshly uploaded video, then the series
    if (this.paidUnlock() && id) {
      this.http.put(`${environment.apiUrl}/api/v1/users/me/videos/${id}/price`, { coinPrice: this.coinPrice })
        .subscribe({ next: setSeries, error: setSeries })
    } else {
      setSeries()
    }
  }
}

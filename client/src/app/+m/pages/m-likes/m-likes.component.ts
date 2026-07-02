import { switchMap } from 'rxjs/operators'
import { HttpClient, HttpParams } from '@angular/common/http'
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { AuthService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { Video } from '@app/shared/shared-main/video/video.model'
import { VideoService } from '@app/shared/shared-main/video/video.service'
import { ResultList, Video as VideoServerModel } from '@boomboom/boomboom-models'
import { environment } from '../../../../environments/environment'
import { MVideoGridComponent } from '../../shared/m-video-grid.component'

// 我的喜欢 — videos the user liked, from GET /accounts/:handle/ratings?rating=like
@Component({
  selector: 'm-likes',
  templateUrl: './m-likes.component.html',
  styleUrls: [ './m-likes.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ GlobalIconComponent, RouterLink, MVideoGridComponent ]
})
export class MLikesComponent implements OnInit {
  private http = inject(HttpClient)
  private auth = inject(AuthService)
  private videoService = inject(VideoService)
  private router = inject(Router)

  videos = signal<Video[]>([])
  loading = signal(true)

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  ngOnInit () {
    const handle = this.auth.getUser()?.account?.nameWithHost
    if (!handle) {
      this.loading.set(false)
      return
    }

    const url = environment.apiUrl + '/api/v1/accounts/' + handle + '/ratings'
    const params = new HttpParams()
      .set('rating', 'like')
      .set('start', '0')
      .set('count', '40')

    this.http.get<ResultList<{ video: VideoServerModel, rating: string }>>(url, { params })
      .pipe(
        switchMap(res => this.videoService.extractVideos({ total: res.total, data: res.data.map(r => r.video) }))
      )
      .subscribe({
        next: ({ data }) => {
          this.videos.set(data)
          this.loading.set(false)
        },
        error: () => this.loading.set(false)
      })
  }

  open (v: Video) {
    this.router.navigate([ '/m/w', v.shortUUID || v.uuid ])
  }
}

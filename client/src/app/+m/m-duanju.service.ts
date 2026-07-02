import { Observable, of } from 'rxjs'
import { catchError, map, switchMap } from 'rxjs/operators'
import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { RestExtractor } from '@app/core'
import { environment } from '../../environments/environment'

export interface DuanjuWork {
  episodeId: number
  projectId: number
  projectName: string
  title: string
  coverUrl: string | null
}

// Talks to BOOMBOOM's own server-side duanju bridge (/users/me/duanju/*),
// which in turn talks to 短剧工坊. The browser never calls duanju directly.
@Injectable()
export class MDuanjuService {
  private authHttp = inject(HttpClient)
  private restExtractor = inject(RestExtractor)

  private static BASE = environment.apiUrl + '/api/v1/users/me/duanju'
  private static UPLOAD = environment.apiUrl + '/api/v1/videos/upload'
  private static VIDEOS = environment.apiUrl + '/api/v1/users/me/videos'

  status () {
    return this.authHttp
      .get<{ connected: boolean, username: string | null }>(`${MDuanjuService.BASE}/status`)
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }

  connect (username: string, password: string) {
    return this.authHttp
      .post<{ connected: boolean, username: string }>(`${MDuanjuService.BASE}/connect`, { username, password })
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }

  disconnect () {
    return this.authHttp
      .post<{ connected: boolean }>(`${MDuanjuService.BASE}/disconnect`, {})
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }

  works () {
    return this.authHttp
      .get<{ total: number, data: DuanjuWork[] }>(`${MDuanjuService.BASE}/works`)
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }

  // Import one finished episode into BOOMBOOM:
  // download the mp4 through the bridge (authed) -> upload as a BOOMBOOM video -> tag source + series.
  // seriesName override lets "续集" import a duanju episode INTO an existing BOOMBOOM drama;
  // when omitted it groups by the duanju project name.
  importEpisode (work: DuanjuWork, channelId: number, seriesName?: string): Observable<any> {
    const series = (seriesName && seriesName.trim()) || work.projectName || work.title

    return this.authHttp.get(`${MDuanjuService.BASE}/download/${work.episodeId}`, { responseType: 'blob' })
      .pipe(
        switchMap(blob => {
          const fd = new FormData()
          fd.append('videofile', blob, `duanju_ep_${work.episodeId}.mp4`)
          fd.append('channelId', String(channelId))
          fd.append('name', work.title || `短剧工坊 ${work.episodeId}`)
          fd.append('privacy', '1')
          return this.authHttp.post<any>(MDuanjuService.UPLOAD, fd)
        }),
        switchMap((up: any) => {
          const vid = up?.video
          if (!vid?.id) return of(up)
          // tag origin + group by the target drama (续集) or the duanju project
          return this.authHttp.put(`${MDuanjuService.VIDEOS}/${vid.id}/source`, { source: 'duanju' })
            .pipe(
              switchMap(() => this.authHttp.put(`${MDuanjuService.VIDEOS}/${vid.id}/series`, { seriesName: series })),
              map(() => up)
            )
        }),
        catchError(err => this.restExtractor.handleError(err))
      )
  }
}

import { catchError } from 'rxjs/operators'
import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { RestExtractor } from '@app/core'
import { environment } from '../../environments/environment'

export interface Danmaku {
  id?: number
  message: string
  time: number
  color: string
}

@Injectable()
export class MDanmakuService {
  private authHttp = inject(HttpClient)
  private restExtractor = inject(RestExtractor)

  private static BASE = environment.apiUrl + '/api/v1/videos'

  list (videoId: number | string) {
    return this.authHttp
      .get<{ total: number, data: Danmaku[] }>(`${MDanmakuService.BASE}/${videoId}/danmaku`)
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }

  send (videoId: number | string, d: Danmaku) {
    return this.authHttp
      .post<Danmaku>(`${MDanmakuService.BASE}/${videoId}/danmaku`, d)
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }
}

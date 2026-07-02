import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { AuthService } from '@app/core'
import { Observable } from 'rxjs'

/**
 * Integration with the external 短剧生成平台 (drama-generation platform).
 *
 * Two things happen here:
 *  1. Outbound attribution — every link/API call carries a source tag (utm_source=boomboom)
 *     + the BoomBoom user id, so the platform can attribute traffic/creations back to BoomBoom
 *     ("相当于一个广告形式").
 *  2. Deep API calls — create a generation task, list the user's works, import a finished work
 *     back into BoomBoom.
 *
 * ⚠️ The real base URL, auth and endpoint contract must come from the platform's API docs.
 *    Fill in BASE_URL / auth / the endpoint paths + payload shapes below to activate.
 */

export interface DramaGenWork {
  id: string
  title: string
  coverUrl?: string
  status: 'draft' | 'generating' | 'ready' | 'failed'
  createdAt?: string
}

export interface DramaGenCreatePayload {
  prompt?: string
  genre?: string
  episodes?: number
}

// TODO(dramagen): replace with the real platform base URL (or read from server config).
export const DRAMAGEN_BASE_URL = 'https://your-drama-gen-platform.example'

// TODO(dramagen): replace with the real API auth token / key mechanism.
export const DRAMAGEN_API_TOKEN = ''

@Injectable({ providedIn: 'root' })
export class DramaGenService {
  private http = inject(HttpClient)
  private auth = inject(AuthService)

  private get userRef (): string {
    return String(this.auth.getUser()?.id ?? '')
  }

  get isConfigured (): boolean {
    return !!DRAMAGEN_BASE_URL && !DRAMAGEN_BASE_URL.includes('your-drama-gen-platform.example')
  }

  // --- Outbound attribution ------------------------------------------------

  // Builds the platform URL with source attribution params (the "标注来源" / ad-referral part).
  buildAttributedUrl (path = '/create'): string {
    const params = new URLSearchParams({
      utm_source: 'boomboom',
      utm_medium: 'app',
      utm_campaign: 'creator',
      ref: this.userRef
    })
    const sep = path.includes('?') ? '&' : '?'
    return `${DRAMAGEN_BASE_URL}${path}${sep}${params.toString()}`
  }

  openCreate (path = '/create') {
    window.open(this.buildAttributedUrl(path), '_blank', 'noopener')
  }

  // --- Deep API (activate once the platform API contract is known) ---------

  private authHeaders () {
    return DRAMAGEN_API_TOKEN ? { Authorization: `Bearer ${DRAMAGEN_API_TOKEN}` } : {}
  }

  // TODO(dramagen): confirm endpoint + payload with the platform API docs.
  createGeneration (payload: DramaGenCreatePayload): Observable<DramaGenWork> {
    return this.http.post<DramaGenWork>(
      `${DRAMAGEN_BASE_URL}/api/v1/generations`,
      { ...payload, source: 'boomboom', ref: this.userRef },
      { headers: this.authHeaders() }
    )
  }

  // TODO(dramagen): confirm endpoint with the platform API docs.
  listMyWorks (): Observable<DramaGenWork[]> {
    return this.http.get<DramaGenWork[]>(
      `${DRAMAGEN_BASE_URL}/api/v1/generations`,
      { headers: this.authHeaders(), params: { ref: this.userRef } }
    )
  }
}

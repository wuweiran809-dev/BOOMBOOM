import { catchError } from 'rxjs/operators'
import { HttpClient } from '@angular/common/http'
import { Injectable, inject } from '@angular/core'
import { RestExtractor } from '@app/core'
import { environment } from '../../environments/environment'

export interface CoinPackage {
  id: string
  coins: number
  price: string
  hot?: boolean
}

export interface VipPlan {
  id: string
  months: number
  coins: number
  label: string
  best?: boolean
}

// BoomBoom wallet client: coin top-up + VIP activation.
// Package/plan ids MUST match the server list in server/core/controllers/api/users/me.ts
@Injectable()
export class MWalletService {
  private authHttp = inject(HttpClient)
  private restExtractor = inject(RestExtractor)

  private static BASE = environment.apiUrl + '/api/v1/users/me'

  readonly coinPackages: CoinPackage[] = [
    { id: 'p60', coins: 60, price: '¥6' },
    { id: 'p300', coins: 300, price: '¥30', hot: true },
    { id: 'p980', coins: 980, price: '¥98' },
    { id: 'p3280', coins: 3280, price: '¥328' }
  ]

  readonly vipPlans: VipPlan[] = [
    { id: 'v1', months: 1, coins: 300, label: $localize`:@@boomboom.m.recharge.plan1:1 month` },
    { id: 'v3', months: 3, coins: 800, label: $localize`:@@boomboom.m.recharge.plan3:3 months`, best: true },
    { id: 'v12', months: 12, coins: 2800, label: $localize`:@@boomboom.m.recharge.plan12:12 months` }
  ]

  recharge (packageId: string) {
    return this.authHttp
      .post<{ coins: number }>(MWalletService.BASE + '/coins/recharge', { packageId })
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }

  activateVip (planId: string) {
    return this.authHttp
      .post<{ coins: number, vipExpiration: string }>(MWalletService.BASE + '/vip/activate', { planId })
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }

  // Paid unlock: authoritative unlock status for a video
  getPurchaseStatus (videoId: number) {
    return this.authHttp
      .get<{ coinPrice: number, purchased: boolean, unlocked: boolean }>(MWalletService.BASE + '/videos/' + videoId + '/purchase')
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }

  // Paid unlock: buy a video with coins
  purchaseVideo (videoId: number) {
    return this.authHttp
      .post<{ coins: number, unlocked: boolean, purchased: boolean }>(MWalletService.BASE + '/videos/' + videoId + '/purchase', {})
      .pipe(catchError(err => this.restExtractor.handleError(err)))
  }
}

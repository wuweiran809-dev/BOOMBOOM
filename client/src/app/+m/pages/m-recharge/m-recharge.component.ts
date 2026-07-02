import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { AuthService, Notifier } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { CoinPackage, MWalletService, VipPlan } from '../../m-wallet.service'

// 充值 / 开通VIP — real coin top-up + VIP activation (server endpoints in me.ts).
// After success we refresh /me so the wallet updates everywhere.
@Component({
  selector: 'm-recharge',
  templateUrl: './m-recharge.component.html',
  styleUrls: [ './m-recharge.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ MWalletService ],
  imports: [ GlobalIconComponent, RouterLink ]
})
export class MRechargeComponent {
  private wallet = inject(MWalletService)
  private auth = inject(AuthService)
  private router = inject(Router)
  private notifier = inject(Notifier)

  readonly packages = this.wallet.coinPackages
  readonly plans = this.wallet.vipPlans

  busy = signal<string | null>(null)

  get user () {
    return this.auth.getUser()
  }

  get coins (): number {
    return (this.user as any)?.coins ?? 0
  }

  get coinsDisplay (): string {
    return this.coins.toLocaleString('en-US')
  }

  get isVip (): boolean {
    const exp = (this.user as any)?.vipExpiration
    return exp ? new Date(exp).getTime() > Date.now() : false
  }

  get vipExpiryLabel (): string {
    const exp = (this.user as any)?.vipExpiration
    if (!exp) return ''
    return new Date(exp).toLocaleDateString()
  }

  recharge (p: CoinPackage) {
    if (this.busy()) return
    if (!this.auth.isLoggedIn()) {
      this.router.navigate([ '/m/login' ])
      return
    }
    this.busy.set(p.id)

    this.wallet.recharge(p.id).subscribe({
      next: () => {
        this.auth.refreshUserInformation()
        this.notifier.success($localize`:@@boomboom.m.recharge.okCoins:Top-up successful`)
        this.busy.set(null)
      },
      error: () => {
        this.notifier.error($localize`:@@boomboom.m.recharge.fail:Something went wrong, please try again`)
        this.busy.set(null)
      }
    })
  }

  activate (plan: VipPlan) {
    if (this.busy()) return
    if (!this.auth.isLoggedIn()) {
      this.router.navigate([ '/m/login' ])
      return
    }

    if (this.coins < plan.coins) {
      this.notifier.error($localize`:@@boomboom.m.recharge.notEnough:Not enough coins — top up first`)
      return
    }

    this.busy.set(plan.id)

    this.wallet.activateVip(plan.id).subscribe({
      next: () => {
        this.auth.refreshUserInformation()
        this.notifier.success($localize`:@@boomboom.m.recharge.okVip:VIP activated`)
        this.busy.set(null)
      },
      error: () => {
        this.notifier.error($localize`:@@boomboom.m.recharge.fail:Something went wrong, please try again`)
        this.busy.set(null)
      }
    })
  }
}

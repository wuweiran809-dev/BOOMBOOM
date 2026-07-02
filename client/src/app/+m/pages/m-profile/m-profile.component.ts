import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { Router, RouterLink } from '@angular/router'
import { AuthService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { VideoChannel } from '@app/shared/shared-main/channel/video-channel.model'
import { UserSubscriptionService } from '@app/shared/shared-user-subscription/user-subscription.service'
import { MUiService } from '../../m-ui.service'

@Component({
  selector: 'm-profile',
  templateUrl: './m-profile.component.html',
  styleUrls: [ './m-profile.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ UserSubscriptionService ],
  imports: [ GlobalIconComponent, RouterLink ]
})
export class MProfileComponent implements OnInit {
  private auth = inject(AuthService)
  private router = inject(Router)
  private subscriptionService = inject(UserSubscriptionService)
  ui = inject(MUiService)

  // Real subscriptions (followed channels) — "我的追剧"
  myDramas = signal<VideoChannel[]>([])
  myDramasTotal = signal(0)

  readonly notLoggedInLabel = $localize`:@@boomboom.m.profile.notLoggedIn:Not logged in`

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

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

  ngOnInit () {
    if (this.isLoggedIn) this.loadMyDramas()
  }

  private loadMyDramas () {
    this.subscriptionService.listSubscriptions({
      pagination: { currentPage: 1, itemsPerPage: 10 },
      search: ''
    }).subscribe({
      next: ({ data, total }) => {
        this.myDramas.set(data)
        this.myDramasTotal.set(total)
      }
    })
  }

  getAvatarUrl () {
    const avatars = this.user?.account?.avatars
    if (!avatars?.length) return ''
    return avatars[avatars.length - 1].path
  }

  channelAvatar (c: VideoChannel): string {
    const avatars = c?.avatars
    if (!avatars?.length) return ''
    return avatars[avatars.length - 1].path
  }

  openChannel (c: VideoChannel) {
    this.router.navigate([ '/m/c', c.nameWithHost ])
  }

  openMenu () {
    this.ui.openMenu()
  }

  logout () {
    this.auth.logout()
    this.router.navigate([ '/m/login' ])
  }
}

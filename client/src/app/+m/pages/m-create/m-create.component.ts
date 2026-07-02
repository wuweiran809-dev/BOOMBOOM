import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { AuthService, Notifier } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { DuanjuWork, MDuanjuService } from '../../m-duanju.service'

@Component({
  selector: 'm-create',
  templateUrl: './m-create.component.html',
  styleUrls: [ './m-create.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ MDuanjuService ],
  imports: [ GlobalIconComponent, FormsModule, RouterLink ]
})
export class MCreateComponent implements OnInit {
  private duanju = inject(MDuanjuService)
  private auth = inject(AuthService)
  private router = inject(Router)
  private route = inject(ActivatedRoute)
  private notifier = inject(Notifier)

  // "续集" target: import a duanju episode INTO this existing BOOMBOOM drama
  importSeries = signal<string | null>(null)

  connected = signal(false)
  duanjuUsername = signal<string | null>(null)
  works = signal<DuanjuWork[]>([])
  loadingWorks = signal(false)

  // connect form
  username = ''
  password = ''
  connecting = signal(false)

  importingId = signal<number | null>(null)

  get isLoggedIn () {
    return this.auth.isLoggedIn()
  }

  private get channelId (): number | null {
    const chans = (this.auth.getUser() as any)?.videoChannels
    return chans && chans.length ? chans[0].id : null
  }

  ngOnInit () {
    this.importSeries.set(this.route.snapshot.queryParamMap.get('importSeries'))
    if (this.isLoggedIn) this.refreshStatus()
  }

  private refreshStatus () {
    this.duanju.status().subscribe({
      next: s => {
        this.connected.set(s.connected)
        this.duanjuUsername.set(s.username)
        if (s.connected) this.loadWorks()
      }
    })
  }

  connect () {
    const u = this.username.trim()
    if (!u || !this.password || this.connecting()) return

    this.connecting.set(true)
    this.duanju.connect(u, this.password).subscribe({
      next: s => {
        this.connected.set(true)
        this.duanjuUsername.set(s.username)
        this.password = ''
        this.connecting.set(false)
        this.notifier.success($localize`:@@boomboom.m.create.connected:Connected to 短剧工坊`)
        this.loadWorks()
      },
      error: () => {
        this.notifier.error($localize`:@@boomboom.m.create.connectFail:Connection failed — check your account`)
        this.connecting.set(false)
      }
    })
  }

  disconnect () {
    this.duanju.disconnect().subscribe({
      next: () => {
        this.connected.set(false)
        this.duanjuUsername.set(null)
        this.works.set([])
      }
    })
  }

  private loadWorks () {
    this.loadingWorks.set(true)
    this.duanju.works().subscribe({
      next: r => { this.works.set(r.data || []); this.loadingWorks.set(false) },
      error: () => this.loadingWorks.set(false)
    })
  }

  importWork (w: DuanjuWork) {
    if (this.importingId()) return

    const chId = this.channelId
    if (!chId) { this.notifier.error($localize`:@@boomboom.m.create.noChannel:No channel available`); return }

    this.importingId.set(w.episodeId)
    this.duanju.importEpisode(w, chId, this.importSeries() || undefined).subscribe({
      next: (up: any) => {
        this.importingId.set(null)
        this.notifier.success($localize`:@@boomboom.m.create.imported:Imported to BOOMBOOM`)
        // 续集: go back to My Works to see the drama updated; else open the new video
        if (this.importSeries()) {
          this.router.navigate([ '/m/works' ])
          return
        }
        const v = up?.video
        if (v?.shortUUID || v?.uuid) this.router.navigate([ '/m/w', v.shortUUID || v.uuid ])
      },
      error: () => {
        this.importingId.set(null)
        this.notifier.error($localize`:@@boomboom.m.create.importFail:Import failed, please try again`)
      }
    })
  }

  goUpload () {
    if (!this.isLoggedIn) { this.router.navigate([ '/m/login' ]); return }
    this.router.navigate([ '/m/upload' ])
  }

  back () {
    this.router.navigate([ '/m/me' ])
  }
}

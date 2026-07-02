import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { AuthService, Notifier, ServerService } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { getExternalAuthHref } from '@boomboom/boomboom-core-utils'
import { RegisteredExternalAuthConfig } from '@boomboom/boomboom-models'
import { environment } from '../../../../environments/environment'

@Component({
  selector: 'm-login',
  templateUrl: './m-login.component.html',
  styleUrls: [ './m-login.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ FormsModule, RouterLink, GlobalIconComponent ]
})
export class MLoginComponent {
  private auth = inject(AuthService)
  private router = inject(Router)
  private notifier = inject(Notifier)
  private serverService = inject(ServerService)

  email = ''
  password = ''
  showPassword = signal(false)
  submitting = signal(false)
  error = signal<string>('')

  private get externalAuths (): RegisteredExternalAuthConfig[] {
    return this.serverService.getHTMLConfig()?.plugin?.registeredExternalAuths || []
  }

  get googleAuth (): RegisteredExternalAuthConfig | undefined {
    return this.externalAuths.find(a => {
      const hay = `${a.authName} ${a.npmName} ${a.authDisplayName}`.toLowerCase()
      return hay.includes('google')
    })
  }

  get googleHref (): string | null {
    const auth = this.googleAuth
    return auth ? getExternalAuthHref(environment.apiUrl, auth) : null
  }

  togglePassword () {
    this.showPassword.update(v => !v)
  }

  googleUnavailable () {
    this.notifier.error($localize`:@@boomboom.m.login.googleUnavailable:Google sign-in is not configured on this server yet.`)
  }

  login () {
    if (this.submitting()) return
    if (!this.email.trim() || !this.password) {
      this.error.set($localize`:@@boomboom.m.login.errEmpty:Please enter your email and password.`)
      return
    }

    this.error.set('')
    this.submitting.set(true)

    this.auth.login({ username: this.email.trim(), password: this.password })
      .subscribe({
        next: () => {
          this.submitting.set(false)
          this.router.navigate([ '/m/feed' ])
        },
        error: err => {
          this.submitting.set(false)
          this.error.set(err.message || $localize`:@@boomboom.m.login.errFail:Sign-in failed. Please check your email and password.`)
        }
      })
  }
}

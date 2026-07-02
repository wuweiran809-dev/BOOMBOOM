import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { AuthService, Notifier } from '@app/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { SignupService } from '@app/+signup/shared/signup.service'

@Component({
  selector: 'm-register',
  templateUrl: './m-register.component.html',
  styleUrls: [ './m-register.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [ SignupService ],
  imports: [ FormsModule, RouterLink, GlobalIconComponent ]
})
export class MRegisterComponent {
  private signupService = inject(SignupService)
  private auth = inject(AuthService)
  private router = inject(Router)
  private notifier = inject(Notifier)

  username = ''
  email = ''
  password = ''
  invite = ''
  showPassword = signal(false)
  submitting = signal(false)
  error = signal<string>('')

  togglePassword () {
    this.showPassword.update(v => !v)
  }

  private normalizeUsername (raw: string) {
    return (raw || '').toLowerCase().replace(/\s/g, '_').replace(/[^a-z0-9_.]/g, '')
  }

  register () {
    if (this.submitting()) return

    const username = this.normalizeUsername(this.username)

    if (!username || !this.email.trim() || !this.password) {
      this.error.set($localize`:@@boomboom.m.register.errRequired:Please enter a username, email and password`)
      return
    }
    if (this.password.length < 6) {
      this.error.set($localize`:@@boomboom.m.register.errPasswordLength:Password must be at least 6 characters`)
      return
    }

    this.error.set('')
    this.submitting.set(true)

    const body: any = {
      username,
      password: this.password,
      email: this.email.trim(),
      displayName: this.username.trim() || username,
      channel: {
        name: username + '_channel',
        displayName: (this.username.trim() || username) + ' 的频道'
      }
    }

    this.signupService.signup(body).subscribe({
      next: () => {
        // Try to auto-login (works when email verification is not required)
        this.auth.login({ username, password: this.password }).subscribe({
          next: () => {
            this.submitting.set(false)
            this.notifier.success($localize`:@@boomboom.m.register.successWelcome:Signed up successfully, welcome to BoomBoom!`)
            this.router.navigate([ '/m/feed' ])
          },
          error: () => {
            this.submitting.set(false)
            this.notifier.success($localize`:@@boomboom.m.register.successLogin:Signed up successfully, please log in`)
            this.router.navigate([ '/m/login' ])
          }
        })
      },
      error: err => {
        this.submitting.set(false)
        this.error.set(err.message || $localize`:@@boomboom.m.register.errFailed:Sign up failed, please try again later`)
      }
    })
  }
}

import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'

@Injectable({ providedIn: 'root' })
export class BoomboomModalService {
  openQuickSettingsSubject = new Subject<void>()
  openAdminConfigWizardSubject = new Subject<{ showWelcome: boolean }>()
}

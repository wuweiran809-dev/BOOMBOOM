import { Location } from '@angular/common'
import { Component, ElementRef, OnInit, inject, output, viewChild, ChangeDetectionStrategy } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { Notifier, User, UserService } from '@app/core'
import { BoomboomCheckboxComponent } from '@app/shared/shared-forms/boomboom-checkbox.component'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { NgbModal } from '@ng-bootstrap/ng-bootstrap'
import { About, ServerConfig } from '@boomboom/boomboom-models'
import { logger } from '@root-helpers/logger'
import { boomboomLocalStorage } from '@root-helpers/boomboom-web-storage'

@Component({
  selector: 'my-instance-config-warning-modal',
  templateUrl: './instance-config-warning-modal.component.html',
  styleUrls: [ './instance-config-warning-modal.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ FormsModule, GlobalIconComponent, BoomboomCheckboxComponent ]
})
export class InstanceConfigWarningModalComponent implements OnInit {
  private userService = inject(UserService)
  private location = inject(Location)
  private modalService = inject(NgbModal)
  private notifier = inject(Notifier)

  readonly modal = viewChild<ElementRef>('modal')

  readonly created = output()

  stopDisplayModal = false
  about: About

  private LS_KEYS = {
    NO_INSTANCE_CONFIG_WARNING_MODAL: 'no_instance_config_warning_modal'
  }

  ngOnInit (): void {
    this.created.emit()
  }

  canBeOpenByUser (user: User) {
    if (this.modalService.hasOpenModals()) return false
    if (user.noInstanceConfigWarningModal === true) return false
    if (boomboomLocalStorage.getItem(this.LS_KEYS.NO_INSTANCE_CONFIG_WARNING_MODAL) === 'true') return false

    return true
  }

  shouldAutoOpen (serverConfig: ServerConfig, about: About) {
    if (this.modalService.hasOpenModals()) return false
    if (!serverConfig.signup.allowed) return false

    return serverConfig.instance.name.toLowerCase() === 'boomboom' ||
      !about.instance.terms ||
      !about.instance.administrator ||
      !about.instance.maintenanceLifetime
  }

  show (about: About) {
    if (this.location.path().startsWith('/admin/settings/config/edit-custom')) return

    this.about = about

    const ref = this.modalService.open(this.modal(), { centered: true })

    ref.result.finally(() => {
      if (this.stopDisplayModal === true) this.doNotOpenAgain()
    })
  }

  isDefaultShortDescription (description: string) {
    return description === 'BoomBoom, an ActivityPub-federated video streaming platform using P2P directly in your web browser.'
  }

  private doNotOpenAgain () {
    boomboomLocalStorage.setItem(this.LS_KEYS.NO_INSTANCE_CONFIG_WARNING_MODAL, 'true')

    this.userService.updateMyProfile({ noInstanceConfigWarningModal: true })
      .subscribe({
        next: () => logger.info('We will not open the instance config warning modal again.'),

        error: err => this.notifier.handleError(err)
      })
  }
}

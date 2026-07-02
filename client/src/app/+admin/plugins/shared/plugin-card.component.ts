import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core'
import { BoomBoomPlugin, BoomBoomPluginIndex, PluginType_Type } from '@boomboom/boomboom-models'
import { PluginApiService } from '../../../shared/shared-admin/plugin-api.service'
import { GlobalIconComponent } from '../../../shared/shared-icons/global-icon.component'

@Component({
  selector: 'my-plugin-card',
  templateUrl: './plugin-card.component.html',
  styleUrls: [ './plugin-card.component.scss' ],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ GlobalIconComponent ]
})
export class PluginCardComponent {
  private pluginApiService = inject(PluginApiService)

  readonly plugin = input<BoomBoomPluginIndex | BoomBoomPlugin>(undefined)
  readonly version = input<string>(undefined)
  readonly pluginType = input<PluginType_Type>(undefined)

  getPluginOrThemeHref (name: string) {
    return this.pluginApiService.getPluginOrThemeHref(this.pluginType(), name)
  }
}

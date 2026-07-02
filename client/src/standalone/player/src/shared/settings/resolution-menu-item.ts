import videojs from 'video.js'
import { clearStoredPreferredResolution, savePreferredResolution } from '../../boomboom-player-local-storage'
import { VideojsMenuItem, VideojsMenuItemOptions, VideojsPlayer } from '../../types'

const MenuItem = videojs.getComponent('MenuItem') as typeof VideojsMenuItem

export interface ResolutionMenuItemOptions extends VideojsMenuItemOptions {
  resolutionId?: number
}

class ResolutionMenuItem extends MenuItem {
  declare readonly resolutionId: number
  declare private readonly label: string

  declare private autoResolutionChosen: string

  declare private updateSelectionHandler: () => void

  constructor (player: VideojsPlayer, options?: ResolutionMenuItemOptions) {
    super(player, { ...options, selectable: true })

    this.autoResolutionChosen = ''

    this.resolutionId = options.resolutionId
    this.label = options.label

    this.updateSelectionHandler = () => this.updateSelection()
    player.boomboomResolutions().on('resolutions-changed', this.updateSelectionHandler)
  }

  dispose () {
    this.player().boomboomResolutions().off('resolutions-changed', this.updateSelectionHandler)

    super.dispose()
  }

  handleClick (event: any) {
    super.handleClick(event)

    this.player().boomboomResolutions().select({ id: this.resolutionId, fireCallback: true })

    if (this.resolutionId === -1) {
      clearStoredPreferredResolution()
      return
    }

    const selectedResolution = this.player().boomboomResolutions().getResolutions().find(r => r.id === this.resolutionId)
    if (selectedResolution?.height === undefined) return

    savePreferredResolution(selectedResolution.height)
  }

  updateSelection () {
    const selectedResolution = this.player().boomboomResolutions().getSelected()

    if (this.resolutionId === -1) {
      this.autoResolutionChosen = this.player().boomboomResolutions().getAutoResolutionChosen()?.label
    }

    this.selected(this.resolutionId === selectedResolution.id)
  }

  getLabel () {
    if (this.resolutionId === -1) {
      return this.label + ' <small>' + this.autoResolutionChosen + '</small>'
    }

    return this.label
  }
}
videojs.registerComponent('ResolutionMenuItem', ResolutionMenuItem)

export { ResolutionMenuItem }

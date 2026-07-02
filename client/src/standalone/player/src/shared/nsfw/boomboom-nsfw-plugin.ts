import videojs from 'video.js'
import { VideojsPlayer, VideojsPlugin } from '../../types'
import { BoomBoomNSFWDetailsComponent } from './boomboom-nsfw-details-component'
import { BoomBoomNSFWInfoComponent } from './boomboom-nsfw-info-component'

const Plugin = videojs.getPlugin('plugin') as typeof VideojsPlugin

export type BoomBoomNSFWPluginOptions = {
  summary: string
  flags: number
}

class BoomBoomNSFWPlugin extends Plugin {
  declare private nsfwInfoComponent: BoomBoomNSFWInfoComponent
  declare private nsfwDetailsComponent: BoomBoomNSFWDetailsComponent

  constructor (player: VideojsPlayer, options: BoomBoomNSFWPluginOptions) {
    super(player)

    player.ready(() => {
      player.addClass('boomboom-nsfw')

      this.nsfwInfoComponent = new BoomBoomNSFWInfoComponent(player, options)
      player.addChild(this.nsfwInfoComponent)

      this.nsfwDetailsComponent = new BoomBoomNSFWDetailsComponent(player, options)
      this.nsfwDetailsComponent.hide()
      player.addChild(this.nsfwDetailsComponent)

      this.nsfwInfoComponent.on('showDetails', () => {
        this.nsfwDetailsComponent.show()
        this.nsfwInfoComponent.hide()
      })

      this.nsfwDetailsComponent.on('hideDetails', () => {
        this.nsfwInfoComponent.show()
        this.nsfwDetailsComponent.hide()
      })
    })

    player.one('play', () => {
      this.nsfwInfoComponent.hide()
    })
  }

  dispose () {
    this.nsfwInfoComponent?.dispose()
    this.player.removeChild(this.nsfwInfoComponent)
    this.player.removeChild(this.nsfwDetailsComponent)
    this.player.removeClass('boomboom-nsfw')

    super.dispose()
  }
}

videojs.registerPlugin('boomboomNSFW', BoomBoomNSFWPlugin)

export { BoomBoomNSFWPlugin }

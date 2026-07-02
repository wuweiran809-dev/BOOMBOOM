import videojs from 'video.js'
import { VideojsPlayer, VideojsPlugin } from '../../types'
import { BoomBoomDockComponent } from './boomboom-dock-component'

const Plugin = videojs.getPlugin('plugin') as typeof VideojsPlugin

export type BoomBoomDockPluginOptions = {
  title?: string
  description?: string
  avatarUrl?: string
}

class BoomBoomDockPlugin extends Plugin {
  declare private dockComponent: BoomBoomDockComponent

  constructor (player: VideojsPlayer, options: BoomBoomDockPluginOptions) {
    super(player)

    player.ready(() => {
      player.addClass('boomboom-dock')
    })

    this.dockComponent = new BoomBoomDockComponent(player, options)
    player.addChild(this.dockComponent)
  }

  dispose () {
    this.dockComponent?.dispose()
    this.player.removeChild(this.dockComponent)
    this.player.removeClass('boomboom-dock')

    super.dispose()
  }
}

videojs.registerPlugin('boomboomDock', BoomBoomDockPlugin)
export { BoomBoomDockPlugin }

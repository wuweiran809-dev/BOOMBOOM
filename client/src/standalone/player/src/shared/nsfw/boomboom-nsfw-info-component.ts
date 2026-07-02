import videojs from 'video.js'
import { VideojsComponent, VideojsComponentOptions, VideojsPlayer } from '../../types'
import { type BoomBoomNSFWPluginOptions } from './boomboom-nsfw-plugin'

const Component = videojs.getComponent('Component') as typeof VideojsComponent

class BoomBoomNSFWInfoComponent extends Component {
  declare options_: VideojsComponentOptions & BoomBoomNSFWPluginOptions

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor (player: VideojsPlayer, options: VideojsComponentOptions & BoomBoomNSFWPluginOptions) {
    super(player, options)
  }

  createEl () {
    const el = super.createEl('div', { className: 'nsfw-info' })

    const content = super.createEl('strong')
    content.textContent = this.player().localize('This video contains sensitive content.')
    el.appendChild(content)

    if (this.options_.flags || this.options_.summary) {
      const moreButton = super.createEl(
        'button',
        { textContent: this.player().localize('Learn more') },
        { type: 'button' }
      ) as HTMLButtonElement

      el.appendChild(moreButton)

      moreButton.addEventListener('click', () => {
        this.trigger('showDetails')
      })
    }

    return el
  }
}

videojs.registerComponent('BoomBoomNSFWInfoComponent', BoomBoomNSFWInfoComponent)

export {
  BoomBoomNSFWInfoComponent
}

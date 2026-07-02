import videojs from 'video.js'
import { VideojsComponent, VideojsComponentOptions, VideojsPlayer } from '../../types'

const Component = videojs.getComponent('Component') as typeof VideojsComponent

export type BoomBoomDockComponentOptions = {
  title?: string
  description?: string
  avatarUrl?: string
}

class BoomBoomDockComponent extends Component {
  declare options_: VideojsComponentOptions & BoomBoomDockComponentOptions

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor (player: VideojsPlayer, options: VideojsComponentOptions & BoomBoomDockComponentOptions) {
    super(player, options)
  }

  createEl () {
    const el = super.createEl('div', { className: 'boomboom-dock' })

    if (this.options_.avatarUrl) {
      const avatar = videojs.dom.createEl('img', {
        className: 'boomboom-dock-avatar',
        src: this.options_.avatarUrl
      }, { alt: '' })

      el.appendChild(avatar)
    }

    const elWrapperTitleDescription = super.createEl('div', {
      className: 'boomboom-dock-title-description'
    })

    if (this.options_.title) {
      const title = videojs.dom.createEl('h2', {
        className: 'boomboom-dock-title',
        title: this.options_.title,
        innerText: this.options_.title
      })

      elWrapperTitleDescription.appendChild(title)
    }

    if (this.options_.description) {
      const description = videojs.dom.createEl('div', {
        className: 'boomboom-dock-description',
        title: this.options_.description,
        innerText: this.options_.description
      })

      elWrapperTitleDescription.appendChild(description)
    }

    if (this.options_.title || this.options_.description) {
      el.appendChild(elWrapperTitleDescription)
    }

    return el
  }
}

videojs.registerComponent('BoomBoomDockComponent', BoomBoomDockComponent)

export {
  BoomBoomDockComponent
}

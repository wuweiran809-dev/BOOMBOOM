import {
  NextPreviousVideoButtonOptions,
  BoomBoomLinkButtonOptions,
  BoomBoomPlayerConstructorOptions,
  BoomBoomPlayerLoadOptions,
  TheaterButtonOptions
} from '../../types'

type ControlBarOptionsBuilderConstructorOptions =
  & Pick<BoomBoomPlayerConstructorOptions, 'boomboomLink' | 'instanceName' | 'theaterButton'>
  & {
    videoShortUUID: () => string
    p2pEnabled: () => boolean

    previousVideo: () => BoomBoomPlayerLoadOptions['previousVideo']
    nextVideo: () => BoomBoomPlayerLoadOptions['nextVideo']
  }

export class ControlBarOptionsBuilder {
  constructor (private options: ControlBarOptionsBuilderConstructorOptions) {
  }

  getChildrenOptions () {
    const children = {
      ...this.getPreviousVideo(),

      playToggle: {},

      ...this.getNextVideo(),

      ...this.getTimeControls(),

      ...this.getProgressControl(),

      p2PInfoButton: {},

      volumePanel: {
        inline: false
      },

      captionToggleButton: {},

      ...this.getSettingsButton(),

      ...this.getBoomBoomLinkButton(),

      ...this.getTheaterButton(),

      fullscreenToggle: {}
    }

    return children
  }

  private getSettingsButton () {
    const settingEntries: string[] = []

    settingEntries.push('playbackRateMenuButton')
    settingEntries.push('captionsButton')
    settingEntries.push('resolutionMenuButton')
    settingEntries.push('videoFilterMenuButton')

    return {
      settingsButton: {
        setup: {
          maxHeightOffset: 60
        },
        entries: settingEntries
      }
    }
  }

  private getTimeControls () {
    return {
      boomBoomLiveDisplay: {},

      currentTimeDisplay: {},
      timeDivider: {},
      durationDisplay: {}
    }
  }

  private getProgressControl () {
    return {
      progressControl: {
        children: {
          seekBar: {
            children: [ 'loadProgressBar', 'playProgressBar' ]
          }
        }
      }
    }
  }

  private getPreviousVideo () {
    const buttonOptions: NextPreviousVideoButtonOptions = {
      type: 'previous',
      handler: () => this.options.previousVideo().handler(),
      isDisabled: () => !this.options.previousVideo().enabled,
      isDisplayed: () => this.options.previousVideo().displayControlBarButton
    }

    return { previousVideoButton: buttonOptions }
  }

  private getNextVideo () {
    const buttonOptions: NextPreviousVideoButtonOptions = {
      type: 'next',
      handler: () => this.options.nextVideo().handler(),
      isDisabled: () => !this.options.nextVideo().enabled,
      isDisplayed: () => this.options.nextVideo().displayControlBarButton
    }

    return { nextVideoButton: buttonOptions }
  }

  private getBoomBoomLinkButton () {
    const options: BoomBoomLinkButtonOptions = {
      isDisplayed: this.options.boomboomLink,
      shortUUID: this.options.videoShortUUID,
      instanceName: this.options.instanceName
    }

    return { boomBoomLinkButton: options }
  }

  private getTheaterButton () {
    const options: TheaterButtonOptions = {
      isDisplayed: () => this.options.theaterButton
    }

    return {
      theaterButton: options
    }
  }
}

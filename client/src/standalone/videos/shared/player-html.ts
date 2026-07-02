import { boomboomTranslate } from '@boomboom/boomboom-core-utils'
import { logger } from '../../../root-helpers'
import { Translations } from './translations'

export class PlayerHTML {
  private readonly wrapperElement: HTMLElement

  private initVideoEl: HTMLVideoElement
  private informationElement: HTMLDivElement

  constructor (private readonly videoWrapperId: string) {
    this.wrapperElement = document.getElementById(this.videoWrapperId)
  }

  getInitVideoEl () {
    return this.initVideoEl
  }

  setInitVideoEl (playerElement: HTMLVideoElement) {
    this.initVideoEl = playerElement
  }

  addInitVideoElToDOM () {
    this.wrapperElement.appendChild(this.initVideoEl)
  }

  displayError (text: string, translations: Translations) {
    logger.error(text)

    // Remove video element
    if (this.initVideoEl) {
      this.removeElement(this.initVideoEl)
      this.initVideoEl = undefined
    }

    const translatedText = boomboomTranslate(text, translations)
    const translatedSorry = boomboomTranslate('Sorry', translations)

    document.title = translatedSorry + ' - ' + translatedText

    const errorBlock = document.getElementById('error-block')
    errorBlock.style.display = 'flex'

    const errorTitle = document.getElementById('error-title')
    errorTitle.innerHTML = boomboomTranslate('Sorry', translations)

    const errorText = document.getElementById('error-content')
    errorText.innerHTML = translatedText

    document.getElementById('error-details').style.display = 'none'

    this.wrapperElement.style.display = 'none'
  }

  async askVideoPassword (options: { incorrectPassword: boolean, translations: Translations }): Promise<string> {
    const { incorrectPassword, translations } = options
    return new Promise(resolve => {
      this.wrapperElement.style.display = 'none'

      const translatedTitle = boomboomTranslate('This video is password protected', translations)
      const translatedMessage = boomboomTranslate('You need a password to watch this video.', translations)

      document.title = translatedTitle

      const videoPasswordBlock = document.getElementById('video-password-block')
      videoPasswordBlock.style.display = 'flex'

      const videoPasswordTitle = document.getElementById('video-password-title')
      videoPasswordTitle.innerText = translatedTitle

      const videoPasswordMessage = document.getElementById('video-password-content')
      videoPasswordMessage.innerText = translatedMessage

      if (incorrectPassword) {
        const videoPasswordError = document.getElementById('video-password-error')
        videoPasswordError.innerText = boomboomTranslate('Incorrect password, please enter a correct password', translations)
        videoPasswordError.style.transform = 'scale(1.2)'

        setTimeout(() => {
          videoPasswordError.style.transform = 'scale(1)'
        }, 500)
      }

      const videoPasswordSubmitButton = document.getElementById('video-password-submit')
      videoPasswordSubmitButton.innerText = boomboomTranslate('Watch Video', translations)

      const videoPasswordInput = document.getElementById('video-password-input') as HTMLInputElement
      videoPasswordInput.placeholder = boomboomTranslate('Password', translations)

      const videoPasswordForm = document.getElementById('video-password-form')
      videoPasswordForm.addEventListener('submit', event => {
        event.preventDefault()
        const videoPassword = videoPasswordInput.value
        resolve(videoPassword)
      })
    })
  }

  removeVideoPasswordBlock () {
    const videoPasswordBlock = document.getElementById('video-password-block')
    videoPasswordBlock.style.display = 'none'
    this.wrapperElement.style.display = 'block'
  }

  displayInformation (text: string, translations: Translations) {
    if (this.informationElement) this.removeInformation()

    this.informationElement = document.createElement('div')
    this.informationElement.className = 'player-information'
    this.informationElement.innerText = boomboomTranslate(text, translations)

    document.body.appendChild(this.informationElement)
  }

  removeInformation () {
    if (!this.informationElement) return

    this.removeElement(this.informationElement)
    this.informationElement = undefined
  }

  private removeElement (element: HTMLElement) {
    element.parentElement.removeChild(element)
  }
}

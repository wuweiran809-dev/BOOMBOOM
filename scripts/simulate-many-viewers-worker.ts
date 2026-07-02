import Bluebird from 'bluebird'
import { BoomBoomServer } from '@boomboom/boomboom-server-commands'

module.exports = async function sendViews (options: {
  url: string
  videoId: number
  viewers: { xForwardedFor: string }[]
}) {
  const { url, videoId, viewers } = options

  const server = new BoomBoomServer({ url })

  await Bluebird.map(viewers, viewer => {
    return server.views.simulateView({ id: videoId, xForwardedFor: viewer.xForwardedFor })
      .catch(err => console.error('Cannot simulate viewer', err))
  }, { concurrency: 500 })
}

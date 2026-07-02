import { arrayify } from '@boomboom/boomboom-core-utils'
import { BoomBoomServer } from '../server/server.js'

export function setDefaultVideoChannel (servers: BoomBoomServer[]) {
  return Promise.all(
    servers.map(s => {
      return s.users.getMyInfo()
        .then(user => {
          s.store.channel = user.videoChannels[0]
        })
    })
  )
}

export async function setDefaultChannelAvatar (serversArg: BoomBoomServer | BoomBoomServer[], channelName = 'root_channel') {
  const servers = arrayify(serversArg)

  return Promise.all(
    servers.map(s => s.channels.updateImage({ channelName, fixture: 'avatar.png', type: 'avatar' }))
  )
}

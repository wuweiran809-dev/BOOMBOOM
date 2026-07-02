import { arrayify } from '@boomboom/boomboom-core-utils'
import { BoomBoomServer } from '../server/server.js'

export async function setDefaultAccountAvatar (serversArg: BoomBoomServer | BoomBoomServer[], token?: string) {
  const servers = arrayify(serversArg)

  return Promise.all(
    servers.map(s => s.users.updateMyAvatar({ fixture: 'avatar.png', token }))
  )
}

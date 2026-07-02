/* oxlint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/require-await */

import { expect } from 'chai'
import { BoomBoomServer } from '@boomboom/boomboom-server-commands'

async function testHelloWorldRegisteredSettings (server: BoomBoomServer) {
  const body = await server.plugins.getRegisteredSettings({ npmName: 'boomboom-plugin-hello-world' })

  const registeredSettings = body.registeredSettings
  expect(registeredSettings).to.have.length.at.least(1)

  const adminNameSettings = registeredSettings.find(s => s.name === 'admin-name')
  expect(adminNameSettings).to.not.be.undefined
}

export {
  testHelloWorldRegisteredSettings
}

/* oxlint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/require-await */

import { expect } from 'chai'
import { BoomBoomRunnerProcess } from '@tests/shared/boomboom-runner-process.js'
import {
  cleanupTests,
  createSingleServer,
  BoomBoomServer,
  setAccessTokensToServers,
  setDefaultVideoChannel
} from '@boomboom/boomboom-server-commands'

describe('Test boomboom-runner program client CLI', function () {
  let server: BoomBoomServer
  let boomboomRunner: BoomBoomRunnerProcess

  before(async function () {
    this.timeout(120_000)

    server = await createSingleServer(1)

    await setAccessTokensToServers([ server ])
    await setDefaultVideoChannel([ server ])

    await server.config.enableRemoteTranscoding()

    boomboomRunner = new BoomBoomRunnerProcess(server)
    await boomboomRunner.runServer()
  })

  it('Should not have BoomBoom instance listed', async function () {
    const data = await boomboomRunner.listRegisteredBoomBoomInstances()

    expect(data).to.not.contain(server.url)
  })

  it('Should register a new BoomBoom instance', async function () {
    const registrationToken = await server.runnerRegistrationTokens.getFirstRegistrationToken()

    await boomboomRunner.registerBoomBoomInstance({
      registrationToken,
      runnerName: 'my super runner',
      runnerDescription: 'super description'
    })
  })

  it('Should list this new BoomBoom instance', async function () {
    const data = await boomboomRunner.listRegisteredBoomBoomInstances()

    expect(data).to.contain(server.url)
    expect(data).to.contain('my super runner')
    expect(data).to.contain('super description')
  })

  it('Should still have the configuration after a restart', async function () {
    boomboomRunner.kill()

    await boomboomRunner.runServer()
  })

  it('Should unregister the BoomBoom instance', async function () {
    await boomboomRunner.unregisterBoomBoomInstance({ runnerName: 'my super runner' })
  })

  it('Should not have BoomBoom instance listed', async function () {
    const data = await boomboomRunner.listRegisteredBoomBoomInstances()

    expect(data).to.not.contain(server.url)
  })

  after(async function () {
    boomboomRunner.kill()

    await cleanupTests([ server ])
  })
})

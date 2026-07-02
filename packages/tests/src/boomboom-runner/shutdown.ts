/* oxlint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/require-await */

import { wait } from '@boomboom/boomboom-core-utils'
import { RunnerJob, RunnerJobState } from '@boomboom/boomboom-models'
import { buildUUID } from '@boomboom/boomboom-node-utils'
import {
  cleanupTests,
  createSingleServer,
  BoomBoomServer,
  setAccessTokensToServers,
  setDefaultVideoChannel
} from '@boomboom/boomboom-server-commands'
import { BoomBoomRunnerProcess } from '@tests/shared/boomboom-runner-process.js'
import { expect } from 'chai'

describe('Test boomboom-runner shutdown', function () {
  let server: BoomBoomServer
  let boomboomRunner: BoomBoomRunnerProcess

  async function runRunner () {
    const registrationToken = await server.runnerRegistrationTokens.getFirstRegistrationToken()

    boomboomRunner = new BoomBoomRunnerProcess(server)
    await boomboomRunner.runServer()
    await boomboomRunner.registerBoomBoomInstance({ registrationToken, runnerName: buildUUID() })
  }

  before(async function () {
    this.timeout(120_000)

    server = await createSingleServer(1)

    await setAccessTokensToServers([ server ])
    await setDefaultVideoChannel([ server ])

    await server.config.enableTranscoding()
    await server.config.enableRemoteTranscoding()
    await runRunner()
  })

  it('Should graceful shutdown the runner when it has no processing jobs', async function () {
    await boomboomRunner.gracefulShutdown()

    while (!boomboomRunner.hasCorrectlyExited()) {
      await wait(500)
    }
  })

  it('Should graceful shutdown the runner with many jobs to process', async function () {
    await runRunner()

    await server.videos.quickUpload({ name: 'video 1' })
    await server.videos.quickUpload({ name: 'video 2' })

    let processingJobs: RunnerJob[] = []
    while (processingJobs.length === 0) {
      await wait(500)

      const { data } = await server.runnerJobs.list({ stateOneOf: [ RunnerJobState.PROCESSING ] })
      processingJobs = data
    }

    await boomboomRunner.gracefulShutdown()

    while (!boomboomRunner.hasCorrectlyExited()) {
      await wait(500)
    }

    // Check processed jobs are finished
    const { data } = await server.runnerJobs.list({ count: 50 })
    for (const job of processingJobs) {
      expect(data.find(j => j.uuid === job.uuid).state.id).to.equal(RunnerJobState.COMPLETED)
    }

    // Check there are remaining jobs to process
    const { data: pendingJobs } = await server.runnerJobs.list({ stateOneOf: [ RunnerJobState.PENDING ] })
    expect(pendingJobs).to.not.have.lengthOf(0)
  })

  after(async function () {
    boomboomRunner.kill()

    await cleanupTests([ server ])
  })
})

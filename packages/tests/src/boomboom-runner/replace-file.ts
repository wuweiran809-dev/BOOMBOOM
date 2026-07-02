/* oxlint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/require-await */
import { getAllFiles } from '@boomboom/boomboom-core-utils'
import {
  cleanupTests,
  createSingleServer,
  BoomBoomServer,
  setAccessTokensToServers,
  setDefaultVideoChannel,
  waitJobs
} from '@boomboom/boomboom-server-commands'
import { BoomBoomRunnerProcess } from '@tests/shared/boomboom-runner-process.js'
import { checkSourceFile } from '@tests/shared/videos.js'
import { expect } from 'chai'

describe('Test replace file using boomboom-runner program', function () {
  let server: BoomBoomServer
  let boomboomRunner: BoomBoomRunnerProcess
  let uuid: string

  before(async function () {
    this.timeout(120_000)

    server = await createSingleServer(1)

    await setAccessTokensToServers([ server ])
    await setDefaultVideoChannel([ server ])

    await server.config.enableRemoteTranscoding()
    await server.config.enableFileUpdate()
    await server.config.enableMinimumTranscoding({ hls: true, keepOriginal: true, webVideo: true })

    const registrationToken = await server.runnerRegistrationTokens.getFirstRegistrationToken()

    boomboomRunner = new BoomBoomRunnerProcess(server)
    await boomboomRunner.runServer()
    await boomboomRunner.registerBoomBoomInstance({ registrationToken, runnerName: 'runner' })
  })

  it('Should upload a webm video, transcode it and keep original file', async function () {
    this.timeout(240000)

    const fixture = 'video_short.webm'
    ;({ uuid } = await server.videos.quickUpload({ name: 'video', fixture }))

    await waitJobs(server, { runnerJobs: true })

    const video = await server.videos.get({ id: uuid })

    const files = getAllFiles(video)
    expect(files).to.have.lengthOf(4)
    expect(files[0].resolution.id).to.equal(720)

    await checkSourceFile({ server, fsCount: 1, fixture, uuid })
  })

  it('Should upload an audio file, transcode it and keep original file', async function () {
    const fixture = 'sample.ogg'
    const { uuid } = await server.videos.quickUpload({ name: 'audio', fixture })

    await waitJobs([ server ], { runnerJobs: true })
    await checkSourceFile({ server, fsCount: 2, fixture, uuid })
  })

  it('Should replace the video', async function () {
    const fixture = 'video_short_360p.mp4'
    await server.videos.replaceSourceFile({ videoId: uuid, fixture })
    await waitJobs(server, { runnerJobs: true })

    const video = await server.videos.get({ id: uuid })

    const files = getAllFiles(video)
    expect(files).to.have.lengthOf(4)
    expect(files[0].resolution.id).to.equal(360)

    await checkSourceFile({ server, fsCount: 2, fixture, uuid })
  })

  it('Should replace the video by an audio file', async function () {
    {
      await server.videos.removeAllWebVideoFiles({ videoId: uuid })
      const video = await server.videos.get({ id: uuid })
      expect(getAllFiles(video)).to.have.lengthOf(2)
    }

    const fixture = 'sample.ogg'
    await server.videos.replaceSourceFile({ videoId: uuid, fixture })
    await waitJobs(server, { runnerJobs: true })

    const video = await server.videos.get({ id: uuid })

    const files = getAllFiles(video)
    expect(files).to.have.lengthOf(4)

    await checkSourceFile({ server, fsCount: 2, fixture, uuid })
  })

  after(async function () {
    if (boomboomRunner) {
      await boomboomRunner.unregisterBoomBoomInstance({ runnerName: 'runner' })
      boomboomRunner.kill()
    }

    await cleanupTests([ server ])
  })
})

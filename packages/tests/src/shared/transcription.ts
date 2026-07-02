/* oxlint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/require-await */

import { HttpStatusCode } from '@boomboom/boomboom-models'
import { buildAbsoluteFixturePath } from '@boomboom/boomboom-node-utils'
import { makeRawRequest, BoomBoomServer, VideoEdit } from '@boomboom/boomboom-server-commands'
import { downloadFile, unzip } from '@boomboom/boomboom-transcription-devtools'
import { expect } from 'chai'
import { ensureDir, pathExists } from 'fs-extra/esm'
import { join } from 'path'
import { testCaptionFile } from './captions.js'
import { expectStartWith } from './checks.js'
import { FIXTURE_URLS } from './fixture-urls.js'

type CustomModelName = 'tiny.pt' | 'faster-whisper-tiny'

export async function downloadCustomModelsIfNeeded (modelName: CustomModelName) {
  if (await pathExists(getCustomModelPath(modelName))) return

  await ensureDir(getCustomModelDirectory())
  await unzip(await downloadFile(FIXTURE_URLS.transcriptionModels, getCustomModelDirectory()))
}

export function getCustomModelDirectory () {
  return buildAbsoluteFixturePath(join('transcription', 'models-v1'))
}

export function getCustomModelPath (modelName: CustomModelName) {
  return join(getCustomModelDirectory(), 'models', modelName)
}

// ---------------------------------------------------------------------------

export async function checkAutoCaption (options: {
  servers: BoomBoomServer[]
  uuid: string

  captionContains?: RegExp

  rootServer?: BoomBoomServer
  objectStorageBaseUrl?: string
}) {
  const {
    servers,
    rootServer = servers[0],
    uuid,
    captionContains = new RegExp('^WEBVTT\\n\\n00:00.\\d{3} --> 00:'),
    objectStorageBaseUrl
  } = options

  for (const server of servers) {
    const body = await server.captions.list({ videoId: uuid })
    expect(body.total).to.equal(1)
    expect(body.data).to.have.lengthOf(1)

    const caption = body.data[0]
    expect(caption.language.id).to.equal('en')
    expect(caption.language.label).to.equal('English')
    expect(caption.automaticallyGenerated).to.be.true

    if (objectStorageBaseUrl && server === rootServer) {
      expectStartWith(caption.fileUrl, objectStorageBaseUrl)
    }

    await testCaptionFile(caption.fileUrl, captionContains)
  }
}

export async function checkNoCaption (servers: BoomBoomServer[], uuid: string) {
  for (const server of servers) {
    const body = await server.captions.list({ videoId: uuid })
    expect(body.total).to.equal(0)
    expect(body.data).to.have.lengthOf(0)
  }
}

export async function getCaptionContent (server: BoomBoomServer, videoId: string, language: string) {
  const { data } = await server.captions.list({ videoId })

  const caption = data.find(c => c.language.id === language)

  const { text } = await makeRawRequest({ url: caption.fileUrl, expectedStatus: HttpStatusCode.OK_200 })

  return text
}

// ---------------------------------------------------------------------------

export async function checkLanguage (servers: BoomBoomServer[], uuid: string, expected: string | null) {
  for (const server of servers) {
    const video = await server.videos.get({ id: uuid })

    if (expected) {
      expect(video.language.id).to.equal(expected)
    } else {
      expect(video.language.id).to.be.null
    }
  }
}

export async function uploadForTranscription (server: BoomBoomServer, body: Partial<VideoEdit> = {}) {
  const { uuid } = await server.videos.upload({
    attributes: {
      name: 'video',
      fixture: join('transcription', 'videos', 'the_last_man_on_earth.mp4'),
      language: undefined,

      ...body
    }
  })

  return uuid
}

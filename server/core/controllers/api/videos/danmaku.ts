import { HttpStatusCode } from '@boomboom/boomboom-models'
import express from 'express'
import { asyncMiddleware, authenticate } from '../../../middlewares/index.js'
import { VideoDanmakuModel } from '../../../models/video/video-danmaku.js'
import { VideoModel } from '../../../models/video/video.js'

const danmakuRouter = express.Router()

// Public: list danmaku for a video. Auth: send a danmaku.
danmakuRouter.get('/:videoId/danmaku', asyncMiddleware(listDanmaku))
danmakuRouter.post('/:videoId/danmaku', authenticate, asyncMiddleware(addDanmaku))

// ---------------------------------------------------------------------------

export {
  danmakuRouter
}

// ---------------------------------------------------------------------------

async function listDanmaku (req: express.Request, res: express.Response) {
  const video = await VideoModel.load(req.params.videoId)
  if (!video) {
    return res.fail({ status: HttpStatusCode.NOT_FOUND_404, message: 'Video not found' })
  }

  const rows = await VideoDanmakuModel.listByVideo(video.id)

  return res.json({
    total: rows.length,
    data: rows.map(r => ({ id: r.id, message: r.message, time: r.time, color: r.color }))
  })
}

async function addDanmaku (req: express.Request, res: express.Response) {
  const video = await VideoModel.load(req.params.videoId)
  if (!video) {
    return res.fail({ status: HttpStatusCode.NOT_FOUND_404, message: 'Video not found' })
  }

  const message = ('' + (req.body.message ?? '')).trim().slice(0, 100)
  if (!message) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Empty danmaku' })
  }

  const time = Math.max(0, parseFloat(req.body.time) || 0)
  const color = /^#[0-9a-fA-F]{6}$/.test(req.body.color) ? req.body.color : '#ffffff'

  const created = await VideoDanmakuModel.create({
    videoId: video.id,
    userId: res.locals.oauth.token.user.id,
    message,
    time,
    color
  })

  return res.json({ id: created.id, message: created.message, time: created.time, color: created.color })
}

import { getAllPrivacies, pick } from '@boomboom/boomboom-core-utils'
import {
  ActorImageType,
  UserVideoRate as FormattedUserVideoRate,
  HttpStatusCode,
  UserNewFeatureInfoRead,
  UserUpdateMe,
  UserVideoQuota,
  VideoInclude
} from '@boomboom/boomboom-models'
import { AttributesOnly } from '@boomboom/boomboom-typescript-utils'
import { UserAuditView, auditLoggerFactory, getAuditIdFromRes } from '@server/helpers/audit-logger.js'
import { pickCommonVideoQuery } from '@server/helpers/query.js'
import { Hooks } from '@server/lib/plugins/hooks.js'
import { guessAdditionalAttributesFromQuery } from '@server/models/video/formatter/video-api-format.js'
import { VideoCommentModel } from '@server/models/video/video-comment.js'
import express from 'express'
import 'multer'
import { Readable } from 'stream'
import { createReqFiles, getCountVideos } from '../../../helpers/express-utils.js'
import { getFormattedObjects } from '../../../helpers/utils.js'
import { CONFIG } from '../../../initializers/config.js'
import { MIMETYPES } from '../../../initializers/constants.js'
import { sequelizeTypescript } from '../../../initializers/database.js'
import { sendUpdateActor } from '../../../lib/activitypub/send/index.js'
import { deleteLocalActorImageFile, updateLocalActorImageFiles } from '../../../lib/local-actor.js'
import { getOriginalVideoFileTotalDailyFromUser, getOriginalVideoFileTotalFromUser, sendVerifyUserChangeEmail } from '../../../lib/user.js'
import {
  asyncMiddleware,
  asyncRetryTransactionMiddleware,
  authenticate,
  paginationValidator,
  setDefaultPagination,
  setDefaultSort,
  setDefaultVideosSort,
  usersUpdateMeValidator,
  usersVideoRatingValidator
} from '../../../middlewares/index.js'
import { updateAvatarValidator } from '../../../middlewares/validators/actor-image.js'
import {
  commonVideosFiltersValidatorFactory,
  deleteMeValidator,
  listMyVideoImportsValidator,
  listCommentsOnUserVideosValidator,
  listMyVideosValidator,
  videoImportsSortValidator,
  videosSortValidator,
  usersNewFeatureInfoReadValidator
} from '../../../middlewares/validators/index.js'
import { AccountVideoRateModel } from '../../../models/account/account-video-rate.js'
import { AccountModel } from '../../../models/account/account.js'
import { UserModel } from '../../../models/user/user.js'
import { VideoImportModel } from '../../../models/video/video-import.js'
import { VideoModel } from '../../../models/video/video.js'
import { VideoPurchaseModel } from '../../../models/video/video-purchase.js'
import { retryTransactionWrapper } from '@server/helpers/database-utils.js'

const auditLogger = auditLoggerFactory('users')

const reqAvatarFile = createReqFiles([ 'avatarfile' ], MIMETYPES.IMAGE.MIMETYPE_EXT)

const meRouter = express.Router()

meRouter.get('/me', authenticate, asyncMiddleware(getMyInformation))
meRouter.delete('/me', authenticate, deleteMeValidator, asyncMiddleware(deleteMe))

meRouter.get('/me/video-quota-used', authenticate, asyncMiddleware(getMyVideoQuotaUsed))

meRouter.get(
  '/me/videos/imports',
  authenticate,
  paginationValidator,
  videoImportsSortValidator,
  setDefaultSort,
  setDefaultPagination,
  listMyVideoImportsValidator,
  asyncMiddleware(listMyVideoImports)
)

meRouter.get(
  '/me/videos/comments',
  authenticate,
  paginationValidator,
  videosSortValidator,
  setDefaultVideosSort,
  setDefaultPagination,
  asyncMiddleware(listCommentsOnUserVideosValidator),
  asyncMiddleware(listCommentsOnUserVideos)
)

meRouter.get(
  '/me/videos',
  authenticate,
  paginationValidator,
  videosSortValidator,
  setDefaultVideosSort,
  setDefaultPagination,
  commonVideosFiltersValidatorFactory({ allowPrivacyFilterForAllUsers: true }),
  asyncMiddleware(listMyVideosValidator),
  asyncMiddleware(listMyVideos)
)

meRouter.get(
  '/me/videos/:videoId/rating',
  authenticate,
  asyncMiddleware(usersVideoRatingValidator),
  asyncMiddleware(getMyVideoRating)
)

meRouter.put(
  '/me',
  authenticate,
  asyncMiddleware(usersUpdateMeValidator),
  asyncRetryTransactionMiddleware(updateMe)
)

meRouter.post(
  '/me/avatar/pick',
  authenticate,
  reqAvatarFile,
  updateAvatarValidator,
  asyncRetryTransactionMiddleware(updateMyAvatar)
)

meRouter.delete(
  '/me/avatar',
  authenticate,
  asyncRetryTransactionMiddleware(deleteMyAvatar)
)

meRouter.post(
  '/me/new-feature-info/read',
  authenticate,
  usersNewFeatureInfoReadValidator,
  asyncMiddleware(usersNewFeatureInfoRead)
)

// BoomBoom wallet: coin top-up + VIP activation (paid with coins)
meRouter.post('/me/coins/recharge', authenticate, asyncMiddleware(rechargeMyCoins))
meRouter.post('/me/vip/activate', authenticate, asyncMiddleware(activateMyVip))

// BoomBoom paid unlock: per-video purchase status / purchase / owner price setting
meRouter.get('/me/videos/:videoId/purchase', authenticate, asyncMiddleware(getMyVideoPurchase))
meRouter.post('/me/videos/:videoId/purchase', authenticate, asyncMiddleware(purchaseMyVideo))
meRouter.put('/me/videos/:videoId/price', authenticate, asyncMiddleware(setMyVideoPrice))
meRouter.put('/me/videos/:videoId/source', authenticate, asyncMiddleware(setMyVideoSource))

// BoomBoom × 短剧工坊 (duanju) bridge — password-proxy, server-side
meRouter.post('/me/duanju/connect', authenticate, asyncMiddleware(duanjuConnect))
meRouter.get('/me/duanju/status', authenticate, asyncMiddleware(duanjuStatus))
meRouter.post('/me/duanju/disconnect', authenticate, asyncMiddleware(duanjuDisconnect))
meRouter.get('/me/duanju/works', authenticate, asyncMiddleware(duanjuWorks))
meRouter.get('/me/duanju/download/:episodeId', authenticate, asyncMiddleware(duanjuDownload))

// ---------------------------------------------------------------------------

export {
  meRouter
}

// ---------------------------------------------------------------------------

async function listMyVideos (req: express.Request, res: express.Response) {
  const user = res.locals.oauth.token.User
  const countVideos = getCountVideos(req)
  const query = pickCommonVideoQuery(req.query)

  const include = (query.include || VideoInclude.NONE) | VideoInclude.BLACKLISTED | VideoInclude.NOT_PUBLISHED_STATE |
    VideoInclude.BLOCKED_OWNER | VideoInclude.TAGS

  const apiOptions = await Hooks.wrapObject(
    {
      privacyOneOf: getAllPrivacies(),

      ...query,

      // Display all
      nsfw: null,

      user,
      accountId: user.Account.id,
      displayOnlyForFollower: null,

      videoChannelId: res.locals.videoChannel?.id,
      channelNameOneOf: req.query.channelNameOneOf,
      includeCollaborations: req.query.includeCollaborations || false,

      countVideos,

      include
    } satisfies Parameters<typeof VideoModel.listForApi>[0],
    'filter:api.user.me.videos.list.params'
  )

  const resultList = await Hooks.wrapPromiseFun(
    VideoModel.listForApi.bind(VideoModel),
    apiOptions,
    'filter:api.user.me.videos.list.result'
  )

  return res.json(getFormattedObjects(resultList.data, resultList.total, guessAdditionalAttributesFromQuery({ include })))
}

async function listCommentsOnUserVideos (req: express.Request, res: express.Response) {
  const userAccount = res.locals.oauth.token.User.Account

  const resultList = await VideoCommentModel.listForApi({
    ...pick(req.query, [
      'start',
      'count',
      'sort',
      'search',
      'searchAccount',
      'searchVideo',
      'autoTagOneOf'
    ]),

    autoTagOfAccountId: userAccount.id,

    videoAccountOwnerId: userAccount.id,
    videoAccountOwnerIncludeCollaborations: req.query.includeCollaborations || false,

    heldForReview: req.query.isHeldForReview,

    videoChannelOwnerId: res.locals.videoChannel?.id,
    videoId: res.locals.videoWithRights?.id
  })

  return res.json({
    total: resultList.total,
    data: resultList.data.map(c => c.toFormattedForAdminOrUserJSON())
  })
}

async function listMyVideoImports (req: express.Request, res: express.Response) {
  const user = res.locals.oauth.token.User
  const resultList = await VideoImportModel.listUserVideoImportsForApi({
    userId: user.id,

    collaborationAccountId: req.query.includeCollaborations
      ? user.Account.id
      : undefined,

    ...pick(req.query, [ 'id', 'videoId', 'targetUrl', 'start', 'count', 'sort', 'search', 'videoChannelSyncId', 'includeCollaborations' ])
  })

  return res.json(getFormattedObjects(resultList.data, resultList.total))
}

async function getMyInformation (req: express.Request, res: express.Response) {
  // We did not load channels in res.locals.user
  const user = await UserModel.loadForMeAPI(res.locals.oauth.token.user.id)

  const result = await Hooks.wrapObject(
    user.toMeFormattedJSON(),
    'filter:api.user.me.get.result',
    { user }
  )

  return res.json(result)
}

async function getMyVideoQuotaUsed (req: express.Request, res: express.Response) {
  const user = res.locals.oauth.token.user
  const videoQuotaUsed = await getOriginalVideoFileTotalFromUser(user)
  const videoQuotaUsedDaily = await getOriginalVideoFileTotalDailyFromUser(user)

  const data: UserVideoQuota = {
    videoQuotaUsed,
    videoQuotaUsedDaily
  }
  return res.json(data)
}

async function getMyVideoRating (req: express.Request, res: express.Response) {
  const videoId = res.locals.videoId.id
  const accountId = +res.locals.oauth.token.User.Account.id

  const ratingObj = await AccountVideoRateModel.load(accountId, videoId, null)
  const rating = ratingObj ? ratingObj.type : 'none'

  const json: FormattedUserVideoRate = {
    videoId,
    rating
  }
  return res.json(json)
}

async function deleteMe (req: express.Request, res: express.Response) {
  const user = await UserModel.loadByIdWithChannels(res.locals.oauth.token.User.id)

  auditLogger.delete(getAuditIdFromRes(res), new UserAuditView(user.toFormattedJSON()))

  await retryTransactionWrapper(() => {
    return sequelizeTypescript.transaction(t => {
      return user.destroy({ transaction: t })
    })
  })

  Hooks.runAction('action:api.user.deleted', { user, req, res })

  return res.status(HttpStatusCode.NO_CONTENT_204).end()
}

async function updateMe (req: express.Request, res: express.Response) {
  const body: UserUpdateMe = req.body
  let sendVerificationEmail = false

  const user = res.locals.oauth.token.user

  const keysToUpdate: (keyof UserUpdateMe & keyof AttributesOnly<UserModel>)[] = [
    'password',
    'nsfwPolicy',
    'nsfwFlagsDisplayed',
    'nsfwFlagsHidden',
    'nsfwFlagsWarned',
    'nsfwFlagsBlurred',
    'p2pEnabled',
    'autoPlayVideo',
    'autoPlayNextVideo',
    'autoPlayNextVideoPlaylist',
    'videosHistoryEnabled',
    'videoLanguages',
    'language',
    'theme',
    'noInstanceConfigWarningModal',
    'noAccountSetupWarningModal',
    'noWelcomeModal',
    'p2pEnabled'
  ]

  for (const key of keysToUpdate) {
    if (body[key] !== undefined) user.set(key, body[key])
  }

  if (body.email !== undefined) {
    if (CONFIG.SIGNUP.REQUIRES_EMAIL_VERIFICATION) {
      user.pendingEmail = body.email
      sendVerificationEmail = true
    } else {
      user.email = body.email
    }
  }

  await sequelizeTypescript.transaction(async t => {
    await user.save({ transaction: t })

    if (body.displayName === undefined && body.description === undefined) return

    const userAccount = await AccountModel.load(user.Account.id, t)

    if (body.displayName !== undefined) userAccount.name = body.displayName
    if (body.description !== undefined) userAccount.description = body.description
    await userAccount.save({ transaction: t })

    await sendUpdateActor(userAccount, t)
  })

  if (sendVerificationEmail === true) {
    await sendVerifyUserChangeEmail(user)
  }

  return res.status(HttpStatusCode.NO_CONTENT_204).end()
}

async function updateMyAvatar (req: express.Request, res: express.Response) {
  const avatarPhysicalFile = req.files['avatarfile'][0]
  const user = res.locals.oauth.token.user

  const userAccount = await AccountModel.load(user.Account.id)

  const avatars = await updateLocalActorImageFiles({
    accountOrChannel: userAccount,
    imagePhysicalFile: avatarPhysicalFile,
    type: ActorImageType.AVATAR,
    sendActorUpdate: true
  })

  return res.json({
    avatars: avatars.map(avatar => avatar.toFormattedJSON())
  })
}

async function deleteMyAvatar (req: express.Request, res: express.Response) {
  const user = res.locals.oauth.token.user

  const userAccount = await AccountModel.load(user.Account.id)
  await deleteLocalActorImageFile(userAccount, ActorImageType.AVATAR)

  return res.json({ avatars: [] })
}

async function usersNewFeatureInfoRead (req: express.Request, res: express.Response) {
  const user = res.locals.oauth.token.user
  const body: UserNewFeatureInfoRead = req.body

  user.newFeaturesInfoRead |= body.feature
  await user.save()

  return res.status(HttpStatusCode.NO_CONTENT_204).end()
}

// ---------------------------------------------------------------------------
// BoomBoom wallet
// ---------------------------------------------------------------------------

// Coin top-up packages (coins granted). No real payment gateway yet: the balance
// change is real and persisted, only the money movement is simulated.
const BOOMBOOM_COIN_PACKAGES: { id: string, coins: number }[] = [
  { id: 'p60', coins: 60 },
  { id: 'p300', coins: 300 },
  { id: 'p980', coins: 980 },
  { id: 'p3280', coins: 3280 }
]

// VIP plans: paid with coins from the wallet, extend vipExpiration.
const BOOMBOOM_VIP_PLANS: { id: string, months: number, coins: number }[] = [
  { id: 'v1', months: 1, coins: 300 },
  { id: 'v3', months: 3, coins: 800 },
  { id: 'v12', months: 12, coins: 2800 }
]

const BOOMBOOM_MONTH_MS = 30 * 24 * 3600 * 1000

async function rechargeMyCoins (req: express.Request, res: express.Response) {
  const pkg = BOOMBOOM_COIN_PACKAGES.find(p => p.id === req.body.packageId)
  if (!pkg) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Unknown coin package' })
  }

  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)
  user.coins = (user.coins || 0) + pkg.coins
  await user.save()

  return res.json({ coins: user.coins })
}

async function activateMyVip (req: express.Request, res: express.Response) {
  const plan = BOOMBOOM_VIP_PLANS.find(p => p.id === req.body.planId)
  if (!plan) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Unknown VIP plan' })
  }

  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)

  if ((user.coins || 0) < plan.coins) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Not enough coins' })
  }

  const now = Date.now()
  const base = user.vipExpiration && new Date(user.vipExpiration).getTime() > now
    ? new Date(user.vipExpiration).getTime()
    : now

  user.coins = user.coins - plan.coins
  user.vipExpiration = new Date(base + plan.months * BOOMBOOM_MONTH_MS)
  await user.save()

  return res.json({ coins: user.coins, vipExpiration: user.vipExpiration })
}

// ---------------------------------------------------------------------------
// BoomBoom paid unlock
// ---------------------------------------------------------------------------

// A video is "unlocked" for a user when it's free, already purchased, or the
// user is a VIP or the owner.
function isVideoUnlockedFor (user: any, video: any, hasPurchase: boolean): boolean {
  if ((video.coinPrice || 0) <= 0) return true
  if (hasPurchase) return true

  const isVip = user.vipExpiration && new Date(user.vipExpiration).getTime() > Date.now()
  if (isVip) return true

  const ownerUserId = video.VideoChannel?.Account?.userId
  if (ownerUserId && ownerUserId === user.id) return true

  return false
}

async function getMyVideoPurchase (req: express.Request, res: express.Response) {
  const video = await VideoModel.loadFull(req.params.videoId)
  if (!video) {
    return res.fail({ status: HttpStatusCode.NOT_FOUND_404, message: 'Video not found' })
  }

  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)
  const hasPurchase = !!(await VideoPurchaseModel.load(user.id, video.id))

  return res.json({
    coinPrice: video.coinPrice || 0,
    purchased: hasPurchase,
    unlocked: isVideoUnlockedFor(user, video, hasPurchase)
  })
}

async function purchaseMyVideo (req: express.Request, res: express.Response) {
  const video = await VideoModel.loadFull(req.params.videoId)
  if (!video) {
    return res.fail({ status: HttpStatusCode.NOT_FOUND_404, message: 'Video not found' })
  }

  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)
  const hasPurchase = !!(await VideoPurchaseModel.load(user.id, video.id))

  // Already unlocked (free / owned / VIP / owner): nothing to charge
  if (isVideoUnlockedFor(user, video, hasPurchase)) {
    return res.json({ coins: user.coins, unlocked: true, purchased: hasPurchase })
  }

  const price = video.coinPrice || 0
  if ((user.coins || 0) < price) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Not enough coins' })
  }

  await sequelizeTypescript.transaction(async t => {
    user.coins = user.coins - price
    await user.save({ transaction: t })

    await VideoPurchaseModel.create({ videoId: video.id, userId: user.id, coinsPaid: price }, { transaction: t })
  })

  return res.json({ coins: user.coins, unlocked: true, purchased: true })
}

async function setMyVideoPrice (req: express.Request, res: express.Response) {
  const price = parseInt(req.body.coinPrice, 10)
  if (isNaN(price) || price < 0) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Invalid coinPrice' })
  }

  const video = await VideoModel.loadFull(req.params.videoId)
  if (!video) {
    return res.fail({ status: HttpStatusCode.NOT_FOUND_404, message: 'Video not found' })
  }

  if (video.VideoChannel?.Account?.userId !== res.locals.oauth.token.user.id) {
    return res.fail({ status: HttpStatusCode.FORBIDDEN_403, message: 'Not your video' })
  }

  video.coinPrice = price
  await video.save()

  return res.json({ coinPrice: video.coinPrice })
}

async function setMyVideoSource (req: express.Request, res: express.Response) {
  const source = ('' + (req.body.source ?? '')).slice(0, 50)

  const video = await VideoModel.loadFull(req.params.videoId)
  if (!video) {
    return res.fail({ status: HttpStatusCode.NOT_FOUND_404, message: 'Video not found' })
  }

  if (video.VideoChannel?.Account?.userId !== res.locals.oauth.token.user.id) {
    return res.fail({ status: HttpStatusCode.FORBIDDEN_403, message: 'Not your video' })
  }

  video.externalSource = source || null
  await video.save()

  return res.json({ externalSource: video.externalSource })
}

// ---------------------------------------------------------------------------
// BoomBoom × 短剧工坊 (duanju) bridge (password-proxy, server-side)
// ---------------------------------------------------------------------------

const DUANJU_BASE_URL = process.env.BOOMBOOM_DUANJU_URL || 'https://ai.xss16.com'

async function duanjuConnect (req: express.Request, res: express.Response) {
  const { username, password } = req.body
  if (!username || !password) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'username and password required' })
  }

  let r: any
  try {
    r = await fetch(`${DUANJU_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
  } catch {
    return res.fail({ status: HttpStatusCode.BAD_GATEWAY_502, message: 'Cannot reach 短剧工坊' })
  }

  if (!r.ok) {
    return res.fail({ status: HttpStatusCode.UNAUTHORIZED_401, message: '短剧工坊 login failed' })
  }

  const setCookies: string[] = (r.headers as any).getSetCookie ? (r.headers as any).getSetCookie() : []
  const session = setCookies.map(c => c.split(';')[0]).find(c => c.startsWith('session='))
  if (!session) {
    return res.fail({ status: HttpStatusCode.BAD_GATEWAY_502, message: 'No session returned by 短剧工坊' })
  }

  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)
  user.duanjuSession = session
  user.duanjuUsername = username
  await user.save()

  return res.json({ connected: true, username })
}

async function duanjuStatus (req: express.Request, res: express.Response) {
  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)
  return res.json({ connected: !!user.duanjuSession, username: user.duanjuUsername || null })
}

async function duanjuDisconnect (req: express.Request, res: express.Response) {
  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)
  user.duanjuSession = null
  user.duanjuUsername = null
  await user.save()
  return res.json({ connected: false })
}

async function duanjuWorks (req: express.Request, res: express.Response) {
  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)
  if (!user.duanjuSession) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Not connected to 短剧工坊' })
  }

  const headers = { Cookie: user.duanjuSession }
  let projects: any[]
  try {
    const pr = await fetch(`${DUANJU_BASE_URL}/api/projects`, { headers })
    if (pr.status === 401) return res.fail({ status: HttpStatusCode.UNAUTHORIZED_401, message: '短剧工坊 session expired, reconnect' })
    projects = await pr.json()
  } catch {
    return res.fail({ status: HttpStatusCode.BAD_GATEWAY_502, message: 'Cannot reach 短剧工坊' })
  }

  const works: any[] = []
  for (const p of (projects || []).slice(0, 30)) {
    try {
      const dr = await fetch(`${DUANJU_BASE_URL}/api/projects/${p.id}`, { headers })
      const detail = await dr.json()
      for (const ep of (detail.episodes || [])) {
        if (ep.status === 'done' && ep.video_path) {
          works.push({
            episodeId: ep.id,
            projectId: p.id,
            projectName: p.name,
            title: ep.title || `EP${ep.episode_no}`,
            coverUrl: ep.cover_url ? `${DUANJU_BASE_URL}${ep.cover_url}` : null
          })
        }
      }
    } catch { /* skip a project that fails to load */ }
  }

  return res.json({ total: works.length, data: works })
}

async function duanjuDownload (req: express.Request, res: express.Response) {
  const user = await UserModel.loadByIdFull(res.locals.oauth.token.user.id)
  if (!user.duanjuSession) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Not connected to 短剧工坊' })
  }

  const epId = parseInt(req.params.episodeId, 10)
  if (isNaN(epId)) {
    return res.fail({ status: HttpStatusCode.BAD_REQUEST_400, message: 'Invalid episode id' })
  }

  let up: any
  try {
    up = await fetch(`${DUANJU_BASE_URL}/media/ep_${epId}.mp4`, { headers: { Cookie: user.duanjuSession } })
  } catch {
    return res.fail({ status: HttpStatusCode.BAD_GATEWAY_502, message: 'Cannot reach 短剧工坊' })
  }

  if (!up.ok || !up.body) {
    return res.fail({ status: HttpStatusCode.BAD_GATEWAY_502, message: 'Download from 短剧工坊 failed' })
  }

  res.setHeader('Content-Type', 'video/mp4')
  Readable.fromWeb(up.body as any).pipe(res)
}

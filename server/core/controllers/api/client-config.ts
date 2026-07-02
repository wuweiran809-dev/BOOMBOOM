import { is18nLocale } from '@boomboom/boomboom-core-utils'
import { HttpStatusCode } from '@boomboom/boomboom-models'
import { setClientLanguageCookie } from '@server/helpers/i18n.js'
import express from 'express'
import { apiRateLimiter } from '../../middlewares/index.js'

const clientConfigRouter = express.Router()

clientConfigRouter.use(apiRateLimiter)

clientConfigRouter.post(
  '/update-interface-language',
  updateLanguage
)

// ---------------------------------------------------------------------------

export {
  clientConfigRouter
}

// ---------------------------------------------------------------------------

function updateLanguage (req: express.Request, res: express.Response) {
  const language = req.body.language

  if (language !== null && !is18nLocale(language)) {
    return res.fail({
      message: req.t('{language} is not a valid language', { language })
    })
  }

  setClientLanguageCookie(res, language)

  return res.sendStatus(HttpStatusCode.NO_CONTENT_204)
}

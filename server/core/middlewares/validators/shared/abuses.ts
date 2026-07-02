import { Response } from 'express'
import { AbuseModel } from '@server/models/abuse/abuse.js'
import { HttpStatusCode } from '@boomboom/boomboom-models'
import { forceNumber } from '@boomboom/boomboom-core-utils'

async function doesAbuseExist (abuseId: number | string, res: Response) {
  const abuse = await AbuseModel.loadByIdWithReporter(forceNumber(abuseId))

  if (!abuse) {
    res.fail({
      status: HttpStatusCode.NOT_FOUND_404,
      message: 'Abuse not found'
    })

    return false
  }

  res.locals.abuse = abuse
  return true
}

// ---------------------------------------------------------------------------

export {
  doesAbuseExist
}

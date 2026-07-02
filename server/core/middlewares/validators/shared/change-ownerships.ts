import { forceNumber } from '@boomboom/boomboom-core-utils'
import { HttpStatusCode } from '@boomboom/boomboom-models'
import { ChangeOwnershipModel } from '@server/models/video/change-ownership.js'
import express from 'express'

export async function doesChangeOwnershipExist (idArg: number | string, req: express.Request, res: express.Response) {
  const id = forceNumber(idArg)
  const changeOwnership = await ChangeOwnershipModel.load(id)

  if (!changeOwnership) {
    res.fail({
      status: HttpStatusCode.NOT_FOUND_404,
      message: req.t('Ownership change not found')
    })
    return false
  }

  res.locals.changeOwnership = changeOwnership

  return true
}

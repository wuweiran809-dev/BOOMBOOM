import { ServerErrorCodeType } from '@boomboom/boomboom-models'

export class BoomBoomServerError extends Error {
  serverCode: ServerErrorCodeType

  constructor (message: string, serverCode: ServerErrorCodeType) {
    super(message)
    this.name = 'CustomError'
    this.serverCode = serverCode
  }
}

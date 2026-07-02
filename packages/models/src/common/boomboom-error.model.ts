import { OAuth2ErrorCodeType, ServerErrorCodeType } from '../server/server-error-code.enum.js'

export type InternalErrorCodeType = 'INVALID_IMAGE_FILE'

type ErrorCode = ServerErrorCodeType | OAuth2ErrorCodeType | InternalErrorCodeType

export class BoomBoomError extends Error {
  code: ErrorCode
  isBoomBoomError = true

  constructor (message: string, code: ErrorCode, cause?: Error) {
    super(message, { cause })

    this.code = code
  }

  static fromError (error: Error, code: ErrorCode) {
    return new BoomBoomError(error.message, code, error)
  }
}

export function isBoomBoomError (error: any): error is BoomBoomError {
  if (!error) return false

  return error instanceof BoomBoomError || error.isBoomBoomError === true
}

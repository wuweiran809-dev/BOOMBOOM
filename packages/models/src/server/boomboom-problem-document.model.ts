import { HttpStatusCodeType } from '../http/http-status-codes.js'
import { OAuth2ErrorCodeType, ServerErrorCodeType } from './server-error-code.enum.js'

export interface BoomBoomProblemDocumentData {
  'invalid-params'?: Record<string, object>

  originUrl?: string

  keyId?: string

  targetUrl?: string

  actorUrl?: string

  // Feeds
  format?: string
  url?: string
}

export interface BoomBoomProblemDocument extends BoomBoomProblemDocumentData {
  type: string
  title: string

  detail: string

  status: HttpStatusCodeType

  docs?: string
  code?: OAuth2ErrorCodeType | ServerErrorCodeType
}

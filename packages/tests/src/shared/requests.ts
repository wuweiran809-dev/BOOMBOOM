import { doRequest } from '@boomboom/boomboom-server/core/helpers/requests.js'

export function makePOSTAPRequest (url: string, body: any, httpSignature: any, headers: any) {
  return doRequest(url, {
    method: 'POST',
    json: body,
    httpSignature,
    headers,
    preventSSRF: false
  })
}

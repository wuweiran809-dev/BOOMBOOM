import { doRequest, BoomBoomRequestOptions } from '@server/helpers/requests.js'

async function httpUnicast (payload: {
  uri: string
  requestOptions: BoomBoomRequestOptions
}) {
  await doRequest(payload.uri, payload.requestOptions)
}

export default httpUnicast

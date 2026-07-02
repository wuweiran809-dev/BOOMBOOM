import request from 'supertest'
import { HttpStatusCode } from '@boomboom/boomboom-models'
import { cleanupTests, createSingleServer, BoomBoomServer } from '@boomboom/boomboom-server-commands'

describe('Start and stop server without web client routes', function () {
  let server: BoomBoomServer

  before(async function () {
    this.timeout(30000)

    server = await createSingleServer(1, {}, { boomboomArgs: [ '--no-client' ] })
  })

  it('Should fail getting the client', function () {
    const req = request(server.url)
      .get('/')

    return req.expect(HttpStatusCode.NOT_FOUND_404)
  })

  after(async function () {
    await cleanupTests([ server ])
  })
})

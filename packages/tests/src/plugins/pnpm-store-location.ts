/* oxlint-disable @typescript-eslint/no-unused-expressions,@typescript-eslint/require-await */

import { cleanupTests, createSingleServer, BoomBoomServer, setAccessTokensToServers } from '@boomboom/boomboom-server-commands'
import { expect } from 'chai'
import { remove } from 'fs-extra/esm'
import { tmpdir } from 'os'
import { join } from 'path'

describe('Test plugin installation when pnpm store changes', function () {
  let server: BoomBoomServer
  let firstStoreDir: string
  let secondStoreDir: string

  before(async function () {
    this.timeout(90000)

    const id = Date.now()
    firstStoreDir = join(tmpdir(), `boomboom-plugin-store-a-${id}`)
    secondStoreDir = join(tmpdir(), `boomboom-plugin-store-b-${id}`)

    server = await createSingleServer(1, undefined, {
      env: {
        npm_config_store_dir: firstStoreDir, // PNPM <= 10
        pnpm_config_store_dir: firstStoreDir // PNPM > 11
      }
    })

    await setAccessTokensToServers([ server ])
  })

  it('Should run pnpm install and retry command if store location changed', async function () {
    this.timeout(90000)

    await server.plugins.install({ npmName: 'boomboom-theme-dark' })

    await server.kill()

    await server.run(undefined, {
      env: {
        npm_config_store_dir: secondStoreDir, // PNPM <= 10
        pnpm_config_store_dir: secondStoreDir // PNPM > 11
      }
    })

    await setAccessTokensToServers([ server ])

    await server.plugins.install({ npmName: 'boomboom-plugin-hello-world' })

    await server.servers.waitUntilLog('Cannot exec pnpm because of an unexpected store location.')

    const packageJSON = await server.plugins.getPackageJSON('boomboom-plugin-hello-world')

    expect(packageJSON.name).to.equal('boomboom-plugin-hello-world')
  })

  after(async function () {
    await cleanupTests([ server ])

    await remove(firstStoreDir)
    await remove(secondStoreDir)
  })
})

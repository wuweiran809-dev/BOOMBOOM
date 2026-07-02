import {
  BoomBoomPluginIndex,
  BoomboomPluginIndexList,
  BoomboomPluginLatestVersionRequest,
  BoomboomPluginLatestVersionResponse,
  ResultList
} from '@boomboom/boomboom-models'
import { sanitizeUrl } from '@server/helpers/core-utils.js'
import { logger } from '@server/helpers/logger.js'
import { doJSONRequest } from '@server/helpers/requests.js'
import { CONFIG } from '@server/initializers/config.js'
import { BOOMBOOM_VERSION } from '@server/initializers/constants.js'
import { PluginModel } from '@server/models/server/plugin.js'
import { PluginManager } from './plugin-manager.js'

export async function listAvailablePluginsFromIndex (options: BoomboomPluginIndexList) {
  const { start = 0, count = 20, search, sort = 'npmName', pluginType } = options

  const searchParams: BoomboomPluginIndexList & Record<string, string | number> = {
    start,
    count,
    sort,
    pluginType,
    search,
    currentBoomBoomEngine: options.currentBoomBoomEngine || BOOMBOOM_VERSION
  }

  const uri = CONFIG.PLUGINS.INDEX.URL + '/api/v1/plugins'

  try {
    const { body } = await doJSONRequest<any>(uri, { searchParams, preventSSRF: false })

    logger.debug('Got result from BoomBoom index.', { body })

    addInstanceInformation(body)

    return body as ResultList<BoomBoomPluginIndex>
  } catch (err) {
    logger.error('Cannot list available plugins from index %s.', uri, { err })
    return undefined
  }
}

function addInstanceInformation (result: ResultList<BoomBoomPluginIndex>) {
  for (const d of result.data) {
    d.installed = PluginManager.Instance.isRegistered(d.npmName)
    d.name = PluginModel.normalizePluginName(d.npmName)
  }

  return result
}

export async function getLatestPluginsVersion (npmNames: string[]): Promise<BoomboomPluginLatestVersionResponse> {
  const bodyRequest: BoomboomPluginLatestVersionRequest = {
    npmNames,
    currentBoomBoomEngine: BOOMBOOM_VERSION
  }

  const uri = sanitizeUrl(CONFIG.PLUGINS.INDEX.URL) + '/api/v1/plugins/latest-version'
  const { body } = await doJSONRequest<BoomboomPluginLatestVersionResponse>(uri, { json: bodyRequest, method: 'POST', preventSSRF: false })

  return body
}

export async function getLatestPluginVersion (npmName: string) {
  const results = await getLatestPluginsVersion([ npmName ])

  if (Array.isArray(results) === false || results.length !== 1) {
    logger.warn(`Cannot get latest supported plugin version of ${npmName}`, { results })
    return undefined
  }

  return results[0].latestVersion
}

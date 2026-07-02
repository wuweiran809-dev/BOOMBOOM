import { PluginType_Type } from '../plugin.type.js'

export interface BoomboomPluginIndexList {
  start: number
  count: number
  sort: string
  pluginType?: PluginType_Type
  currentBoomBoomEngine?: string
  search?: string
}

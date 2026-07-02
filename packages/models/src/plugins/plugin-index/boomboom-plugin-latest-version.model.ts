export interface BoomboomPluginLatestVersionRequest {
  currentBoomBoomEngine?: string

  npmNames: string[]
}

export type BoomboomPluginLatestVersionResponse = {
  npmName: string
  latestVersion: string | null
}[]

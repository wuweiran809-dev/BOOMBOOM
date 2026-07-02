export type EventHandler<T> = (ev: T) => void

export type PlayerEventType =
  'pause' | 'play' |
  'playbackStatusUpdate' |
  'playbackStatusChange' |
  'resolutionUpdate' |
  'volumeChange'

export interface BoomBoomResolution {
  id: any
  label: string
  active: boolean
  height: number

  src?: string
  width?: number
}

export type BoomBoomTextTrack = {
  id: string
  label: string
  src: string
  mode: TextTrackMode
}

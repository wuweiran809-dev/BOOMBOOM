import { Counter, Meter } from '@opentelemetry/api'
import { MVideoImmutable } from '@server/types/models/index.js'
import { PlaybackMetricCreate } from '@boomboom/boomboom-models'

export class PlaybackMetrics {
  private errorsCounter: Counter
  private resolutionChangesCounter: Counter
  private bufferStalledCounter: Counter

  private downloadedBytesP2PCounter: Counter
  private uploadedBytesP2PCounter: Counter

  private downloadedBytesHTTPCounter: Counter

  private peersP2PPeersGaugeBuffer: {
    value: number
    attributes: any
  }[] = []

  constructor (private readonly meter: Meter) {

  }

  buildCounters () {
    this.errorsCounter = this.meter.createCounter('boomboom_playback_errors_count', {
      description: 'Errors collected from BoomBoom player.'
    })

    this.resolutionChangesCounter = this.meter.createCounter('boomboom_playback_resolution_changes_count', {
      description: 'Resolution changes collected from BoomBoom player.'
    })

    this.bufferStalledCounter = this.meter.createCounter('boomboom_playback_buffer_stalled_count', {
      description: 'Number of times playback is stuck because buffer is running out of data, collected from BoomBoom player.'
    })

    this.downloadedBytesHTTPCounter = this.meter.createCounter('boomboom_playback_http_downloaded_bytes', {
      description: 'Downloaded bytes with HTTP by BoomBoom player.'
    })
    this.downloadedBytesP2PCounter = this.meter.createCounter('boomboom_playback_p2p_downloaded_bytes', {
      description: 'Downloaded bytes with P2P by BoomBoom player.'
    })

    this.uploadedBytesP2PCounter = this.meter.createCounter('boomboom_playback_p2p_uploaded_bytes', {
      description: 'Uploaded bytes with P2P by BoomBoom player.'
    })

    this.meter.createObservableGauge('boomboom_playback_p2p_peers', {
      description: 'Total P2P peers connected to the BoomBoom player.'
    }).addCallback(observableResult => {
      for (const gauge of this.peersP2PPeersGaugeBuffer) {
        observableResult.observe(gauge.value, gauge.attributes)
      }

      this.peersP2PPeersGaugeBuffer = []
    })
  }

  observe (video: MVideoImmutable, metrics: PlaybackMetricCreate) {
    const attributes = {
      videoOrigin: video.remote
        ? 'remote'
        : 'local',

      playerMode: metrics.playerMode,

      resolution: metrics.resolution + '',
      fps: metrics.fps + '',

      p2pEnabled: metrics.p2pEnabled,

      videoUUID: video.uuid
    }

    this.errorsCounter.add(metrics.errors, attributes)
    this.resolutionChangesCounter.add(metrics.resolutionChanges, attributes)

    this.downloadedBytesHTTPCounter.add(metrics.downloadedBytesHTTP, attributes)
    this.downloadedBytesP2PCounter.add(metrics.downloadedBytesP2P, attributes)

    this.uploadedBytesP2PCounter.add(metrics.uploadedBytesP2P, attributes)

    if (metrics.bufferStalled) {
      this.bufferStalledCounter.add(metrics.bufferStalled, attributes)
    }

    if (metrics.p2pPeers) {
      this.peersP2PPeersGaugeBuffer.push({
        value: metrics.p2pPeers,
        attributes
      })
    }
  }
}

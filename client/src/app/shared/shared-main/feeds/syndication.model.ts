import { FeedFormatType } from '@boomboom/boomboom-models'

export interface Syndication {
  format: FeedFormatType
  label: string
  url: string
}

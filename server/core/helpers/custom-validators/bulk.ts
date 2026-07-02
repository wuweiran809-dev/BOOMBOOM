import { BulkRemoveCommentsOfBody } from '@boomboom/boomboom-models'

export function isBulkRemoveCommentsOfScopeValid (value: BulkRemoveCommentsOfBody['scope']) {
  return value === 'my-videos' || value === 'instance' || value === 'my-videos-and-collaborations'
}

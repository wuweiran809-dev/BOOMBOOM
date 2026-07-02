import { pick } from '@boomboom/boomboom-core-utils'
import {
  VideoChannelsSearchQueryAfterSanitize,
  VideoPlaylistsSearchQueryAfterSanitize,
  VideosCommonQueryAfterSanitize,
  VideosSearchQueryAfterSanitize
} from '@boomboom/boomboom-models'

function pickCommonVideoQuery (query: VideosCommonQueryAfterSanitize) {
  return pick(query, [
    'start',
    'count',
    'sort',
    'nsfw',
    'nsfwFlagsIncluded',
    'nsfwFlagsExcluded',
    'isLive',
    'includeScheduledLive',
    'categoryOneOf',
    'licenceOneOf',
    'languageOneOf',
    'host',
    'privacyOneOf',
    'tagsOneOf',
    'tagsAllOf',
    'isLocal',
    'include',
    'skipCount',
    'hasHLSFiles',
    'hasWebVideoFiles',
    'search',
    'excludeAlreadyWatched',
    'autoTagOneOf',
    'stateOneOf'
  ])
}

function pickSearchVideoQuery (query: VideosSearchQueryAfterSanitize) {
  return {
    ...pickCommonVideoQuery(query),

    ...pick(query, [
      'searchTarget',
      'host',
      'startDate',
      'endDate',
      'originallyPublishedStartDate',
      'originallyPublishedEndDate',
      'durationMin',
      'durationMax',
      'uuids'
    ])
  }
}

function pickSearchChannelQuery (query: VideoChannelsSearchQueryAfterSanitize) {
  return pick(query, [
    'searchTarget',
    'search',
    'start',
    'count',
    'sort',
    'host',
    'handles'
  ])
}

function pickSearchPlaylistQuery (query: VideoPlaylistsSearchQueryAfterSanitize) {
  return pick(query, [
    'searchTarget',
    'search',
    'start',
    'count',
    'sort',
    'host',
    'uuids'
  ])
}

export {
  pickCommonVideoQuery,
  pickSearchVideoQuery,
  pickSearchPlaylistQuery,
  pickSearchChannelQuery
}

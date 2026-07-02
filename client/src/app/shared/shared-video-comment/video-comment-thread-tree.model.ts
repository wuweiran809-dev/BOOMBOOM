import { VideoCommentThreadTree as VideoCommentThreadTreeServerModel } from '@boomboom/boomboom-models'
import { VideoComment } from './video-comment.model'

export class VideoCommentThreadTree implements VideoCommentThreadTreeServerModel {
  comment: VideoComment
  hasDisplayedChildren: boolean
  children: VideoCommentThreadTree[]
}

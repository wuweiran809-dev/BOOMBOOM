import { Routes } from '@angular/router'
import { VideoFeedComponent } from './video-feed.component'

export default [
  {
    path: '',
    component: VideoFeedComponent,
    data: {
      meta: {
        title: $localize`Feed`
      }
    }
  }
] satisfies Routes

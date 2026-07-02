import { Routes } from '@angular/router'
import { MShellComponent } from './m-shell/m-shell.component'
import { MChannelComponent } from './pages/m-channel/m-channel.component'
import { MCreateComponent } from './pages/m-create/m-create.component'
import { MDiscoverComponent } from './pages/m-discover/m-discover.component'
import { MFeedComponent } from './pages/m-feed/m-feed.component'
import { MHistoryComponent } from './pages/m-history/m-history.component'
import { MLibraryComponent } from './pages/m-library/m-library.component'
import { MLikesComponent } from './pages/m-likes/m-likes.component'
import { MLoginComponent } from './pages/m-login/m-login.component'
import { MNotificationsComponent } from './pages/m-notifications/m-notifications.component'
import { MPlayerComponent } from './pages/m-player/m-player.component'
import { MProfileComponent } from './pages/m-profile/m-profile.component'
import { MRechargeComponent } from './pages/m-recharge/m-recharge.component'
import { MRegisterComponent } from './pages/m-register/m-register.component'
import { MSettingsComponent } from './pages/m-settings/m-settings.component'
import { MUploadComponent } from './pages/m-upload/m-upload.component'
import { MWorksComponent } from './pages/m-works/m-works.component'

export default [
  {
    path: '',
    redirectTo: 'feed',
    pathMatch: 'full'
  },
  {
    path: '',
    component: MShellComponent,
    children: [
      {
        path: 'feed',
        component: MFeedComponent,
        data: { meta: { title: $localize`:@@boomboom.m.route.feed:BoomBoom` } }
      },
      {
        path: 'discover',
        component: MDiscoverComponent,
        data: { meta: { title: $localize`:@@boomboom.m.route.discover:Discover` } }
      },
      {
        path: 'notifications',
        component: MNotificationsComponent,
        data: { meta: { title: $localize`:@@boomboom.m.route.notifications:Messages` } }
      },
      {
        path: 'me',
        component: MProfileComponent,
        data: { meta: { title: $localize`:@@boomboom.m.route.me:Me` } }
      }
    ]
  },

  // Full-screen pages (no bottom tab bar)
  {
    path: 'login',
    component: MLoginComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.login:Log in` } }
  },
  {
    path: 'register',
    component: MRegisterComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.register:Sign up` } }
  },
  {
    path: 'upload',
    component: MUploadComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.upload:Publish` } }
  },
  {
    path: 'settings',
    component: MSettingsComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.settings:Settings` } }
  },
  {
    path: 'create',
    component: MCreateComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.create:Creator Studio` } }
  },
  {
    path: 'works',
    component: MWorksComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.works:My Works` } }
  },
  {
    path: 'history',
    component: MHistoryComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.history:History` } }
  },
  {
    path: 'likes',
    component: MLikesComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.likes:Likes` } }
  },
  {
    path: 'library',
    component: MLibraryComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.library:My List` } }
  },
  {
    path: 'recharge',
    component: MRechargeComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.recharge:Top up` } }
  },
  {
    path: 'c/:handle',
    component: MChannelComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.channel:Channel` } }
  },
  {
    path: 'w/:id',
    component: MPlayerComponent,
    data: { meta: { title: $localize`:@@boomboom.m.route.player:Watch` } }
  }
] satisfies Routes

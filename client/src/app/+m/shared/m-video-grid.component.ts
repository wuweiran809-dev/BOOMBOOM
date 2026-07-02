import { ChangeDetectionStrategy, Component, input, output } from '@angular/core'
import { GlobalIconComponent } from '@app/shared/shared-icons/global-icon.component'
import { Video } from '@app/shared/shared-main/video/video.model'

// Shared 动感海报风 poster grid used by history / likes pages. Real data only.
@Component({
  selector: 'm-video-grid',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ GlobalIconComponent ],
  styleUrls: [ './m-video-grid.component.scss' ],
  template: `
    <div class="m-grid">
      @for (v of videos(); track v.uuid) {
        <button class="m-poster" (click)="open.emit(v)">
          <div class="m-poster-img">
            @if (thumb(v)) {
              <img [src]="thumb(v)" [alt]="v.name" loading="lazy" />
            } @else {
              <div class="m-poster-ph"><my-global-icon iconName="videos"></my-global-icon></div>
            }
            @if (srcLabel(v)) {
              <span class="m-src-badge">{{ srcLabel(v) }}</span>
            }
            <div class="m-poster-grad"></div>
            <div class="m-poster-info">
              <div class="m-poster-name">{{ v.name }}</div>
              <div class="m-poster-plays">
                <my-global-icon iconName="videos"></my-global-icon>
                {{ formatHot(v.views) }}
              </div>
            </div>
          </div>
        </button>
      }
    </div>
  `
})
export class MVideoGridComponent {
  videos = input<Video[]>([])
  open = output<Video>()

  thumb (v: Video): string {
    const t = v?.thumbnails
    return t && t.length > 0 ? t[0].fileUrl : ''
  }

  // Attribution label for imported videos ("来源")
  srcLabel (v: Video): string {
    const s = (v as any)?.externalSource
    if (s === 'duanju') return $localize`:@@boomboom.m.source.duanju:短剧工坊`
    return ''
  }

  formatHot (n: number): string {
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
    if (n >= 10000) return (n / 10000).toFixed(1) + 'w'
    return String(n || 0)
  }
}

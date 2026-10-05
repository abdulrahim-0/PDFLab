import { Component, input } from '@angular/core';

export type IconName =
  | 'merge'
  | 'split'
  | 'rotate'
  | 'rotate-ccw'
  | 'rotate-cw'
  | 'organize'
  | 'compress'
  | 'image'
  | 'images'
  | 'watermark'
  | 'page-numbers'
  | 'unlock'
  | 'trash'
  | 'undo'
  | 'chevron-left'
  | 'chevron-right'
  | 'swap'
  | 'eye'
  | 'eye-off'
  | 'arrow'
  | 'lock'
  | 'upload'
  | 'file'
  | 'close'
  | 'grip'
  | 'chevron-up'
  | 'chevron-down'
  | 'sun'
  | 'moon'
  | 'monitor'
  | 'download'
  | 'alert'
  | 'check'
  | 'plus'
  | 'refresh';

@Component({
  selector: 'app-icon',
  host: { class: 'inline-flex shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      class="h-full w-full"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.75"
      viewBox="0 0 24 24"
    >
      @switch (name()) {
        @case ('arrow') {
          <path d="M5 12h14m-6-6 6 6-6 6" />
        }
        @case ('lock') {
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" />
        }
        @case ('split') {
          <path
            d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2M16 3h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2"
          />
          <path d="M12 3v3m0 4v4m0 4v3" />
        }
        @case ('rotate') {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M15.5 14a3.5 3.5 0 1 1-1-2.5M15.5 10v2h-2" />
        }
        @case ('rotate-cw') {
          <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4" />
        }
        @case ('rotate-ccw') {
          <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" />
        }
        @case ('organize') {
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="9" rx="1.5" />
          <path d="M3 16h18M3 20h12" />
        }
        @case ('compress') {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M12 9v3m0 0-2-2m2 2 2-2M12 18v-3m0 0-2 2m2-2 2 2" />
        }
        @case ('image') {
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5L5 21" />
        }
        @case ('images') {
          <rect x="7" y="7" width="14" height="14" rx="2" />
          <path d="M17 3H5a2 2 0 0 0-2 2v12" />
          <path d="m21 16-4-4-7 7" />
        }
        @case ('watermark') {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M12 10.5c-1.5 2-2.5 3.3-2.5 4.5a2.5 2.5 0 0 0 5 0c0-1.2-1-2.5-2.5-4.5z" />
        }
        @case ('page-numbers') {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M10 13h4m-4 4h4m-3-6-1 8m4-8-1 8" />
        }
        @case ('unlock') {
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 7.5-2m-3.5 10v2" />
        }
        @case ('trash') {
          <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
        }
        @case ('undo') {
          <path d="M9 14 4 9l5-5" />
          <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
        }
        @case ('chevron-left') {
          <path d="m15 6-6 6 6 6" />
        }
        @case ('chevron-right') {
          <path d="m9 6 6 6-6 6" />
        }
        @case ('swap') {
          <path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3" />
        }
        @case ('eye') {
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('eye-off') {
          <path
            d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"
          />
        }
        @case ('upload') {
          <path d="M12 16V4m-5 5 5-5 5 5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        }
        @case ('download') {
          <path d="M12 4v12m-5-5 5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6 6 18" />
        }
        @case ('grip') {
          <path d="M9 6h.01M9 12h.01M9 18h.01M15 6h.01M15 12h.01M15 18h.01" stroke-width="3" />
        }
        @case ('chevron-up') {
          <path d="m6 15 6-6 6 6" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          />
        }
        @case ('moon') {
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        }
        @case ('monitor') {
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8m-4-4v4" />
        }
        @case ('alert') {
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4m0 4h.01" />
        }
        @case ('check') {
          <path d="m5 12 5 5 9-10" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('refresh') {
          <path d="M20 11a8 8 0 0 0-14.7-4.4M4 4v4h4m-4 5a8 8 0 0 0 14.7 4.4M20 20v-4h-4" />
        }
        @default {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          @if (name() === 'merge') {
            <path d="M12 12v6m-3-3h6" />
          }
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
}

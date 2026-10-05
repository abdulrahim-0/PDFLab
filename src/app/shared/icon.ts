import { Component, input } from '@angular/core';

export type IconName =
  | 'merge'
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

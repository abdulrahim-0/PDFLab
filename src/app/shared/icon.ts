import { Component, input } from '@angular/core';

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
        @default {
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          @if (name() === 'merge') {
            <path d="M12 12v6m-3-3h6" />
          } @else {
            <path d="M9 14h6" />
          }
        }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<'merge' | 'delete' | 'arrow' | 'lock'>();
}

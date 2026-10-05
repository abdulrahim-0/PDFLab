import { Component } from '@angular/core';

@Component({
  selector: 'app-logo',
  host: { class: 'inline-flex items-center gap-2' },
  template: `
    <svg class="h-7 w-auto" viewBox="0 0 24 32" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="3"
        width="20"
        height="26"
        rx="4"
        class="fill-surface-container-low stroke-primary-container"
        stroke-width="2"
      />
      <path
        d="M8 11h8M8 15h8M8 19h5"
        class="stroke-primary-container"
        stroke-width="2"
        stroke-linecap="round"
      />
    </svg>
    <span class="text-lg font-semibold tracking-[-0.02em]"
      >PDF<span class="text-primary-container dark:text-primary">Lab</span></span
    >
  `,
})
export class Logo {}

import { Component, computed, input } from '@angular/core';

/** Determinate when `value` (0–1) is set, indeterminate when it's null. */
@Component({
  selector: 'app-progress-bar',
  host: { class: 'block' },
  template: `
    <div class="mb-1.5 flex justify-between text-xs font-medium text-secondary">
      <span>{{ label() }}</span>
      @if (percent() !== null) {
        <span aria-hidden="true">{{ percent() }}%</span>
      }
    </div>
    <div
      class="h-2 overflow-hidden rounded-full bg-surface-container-high"
      role="progressbar"
      [attr.aria-label]="label()"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="percent()"
    >
      @if (percent() === null) {
        <div class="h-full w-1/3 animate-pulse rounded-full bg-primary-container"></div>
      } @else {
        <div
          class="h-full rounded-full bg-primary-container transition-[width] duration-200"
          [style.width.%]="percent()"
        ></div>
      }
    </div>
  `,
})
export class ProgressBar {
  readonly value = input<number | null>(null);
  readonly label = input('Working…');

  protected readonly percent = computed(() => {
    const value = this.value();
    return value === null ? null : Math.round(Math.min(1, Math.max(0, value)) * 100);
  });
}

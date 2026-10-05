import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToolDefinition } from '../../core/tools';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-tool-card',
  imports: [Icon, RouterLink],
  host: { class: 'block' },
  template: `
    <a
      class="group flex h-full flex-col gap-4 rounded-xl border border-transparent bg-surface-container-lowest p-5 shadow-sm transition-[border-color,box-shadow] hover:border-primary-container/40 hover:shadow-md"
      [routerLink]="['/', tool().path]"
    >
      <div
        class="flex size-11 items-center justify-center rounded-lg bg-surface-container-low text-primary-container dark:text-primary"
      >
        <app-icon class="size-6" [name]="tool().icon" />
      </div>
      <div class="flex-1">
        <h2 class="mb-1 text-base font-semibold tracking-[-0.01em]">{{ tool().title }}</h2>
        <p class="text-sm text-secondary">{{ tool().description }}</p>
      </div>
      <span
        class="inline-flex items-center gap-1 text-sm font-medium text-primary-container dark:text-primary"
        aria-hidden="true"
      >
        Open tool
        <app-icon class="size-4 transition-transform group-hover:translate-x-0.5" name="arrow" />
      </span>
    </a>
  `,
})
export class ToolCard {
  readonly tool = input.required<ToolDefinition>();
}

import { Component, input, output } from '@angular/core';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-tool-card',
  imports: [Icon],
  host: { class: 'block w-full' },
  template: `
    <article
      class="flex w-full flex-col justify-between rounded-xl bg-white p-5 shadow-sm"
      [attr.aria-labelledby]="tool() + '-title'"
    >
      <div class="mb-5 flex items-start gap-3">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-primary-container"
        >
          <app-icon class="size-5" [name]="tool()" />
        </div>
        <div class="min-w-0 flex-1">
          <h2
            class="mb-1 text-base leading-6 font-semibold tracking-[-0.01em]"
            [id]="tool() + '-title'"
          >
            {{ title() }}
          </h2>
          <p class="text-xs leading-[1.125rem] tracking-[0.005em] text-secondary">
            {{ description() }}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="flex h-10 w-full cursor-pointer items-center justify-center gap-1 rounded-lg text-sm leading-5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container motion-reduce:transition-none"
        [class]="
          tool() === 'merge'
            ? 'bg-primary-container text-white hover:bg-primary active:opacity-90'
            : 'bg-surface-container-low text-on-surface hover:bg-surface-container active:bg-surface-container-high'
        "
        (click)="selected.emit(tool())"
      >
        <span>{{ actionLabel() }}</span>
        <app-icon class="size-4" name="arrow" />
      </button>
    </article>
  `,
})
export class ToolCard {
  readonly tool = input.required<'merge' | 'delete'>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input.required<string>();
  readonly selected = output<'merge' | 'delete'>();
}

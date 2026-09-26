import { Component, input, output } from '@angular/core';
import { Icon } from '../shared/icon';
import { ToolCardData } from '../shared/ToolCardData';

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
        <label
          class="flex h-10 w-full cursor-pointer items-center justify-center gap-1 rounded-lg bg-primary-container text-sm font-medium text-white"
        >
          <input
            class="sr-only"
            type="file"
            accept=".pdf"
            multiple
            (change)="onFileSelected($event)"
          />

          <span>{{ actionLabel() }}</span>
          <app-icon class="size-4" name="arrow" />
        </label>
    </article>
  `,
})
export class ToolCard {
  readonly tool = input.required<'merge' | 'delete'>();
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly actionLabel = input.required<string>();
  readonly selected = output<ToolCardData>();

  protected onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  this.selected.emit({
    tool: this.tool(),
    files: Array.from(input.files ?? []),
  });
}
}

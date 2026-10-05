import { Component, input, output } from '@angular/core';

export interface OptionChoice<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** A row of mutually exclusive choices, built on native radio buttons. */
@Component({
  selector: 'app-option-group',
  host: { class: 'block' },
  template: `
    <fieldset>
      <legend class="mb-2 text-sm font-semibold">{{ legend() }}</legend>
      <div
        class="grid gap-2"
        [style.grid-template-columns]="'repeat(' + columns() + ', minmax(0, 1fr))'"
      >
        @for (option of options(); track option.value) {
          <label
            class="flex min-w-0 cursor-pointer flex-col justify-center gap-0.5 rounded-lg border px-2.5 py-2 text-[0.8125rem] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container"
            [class]="
              value() === option.value
                ? 'border-primary-container bg-surface-container-low'
                : 'border-outline-variant'
            "
          >
            <input
              class="sr-only"
              type="radio"
              [name]="name()"
              [value]="option.value"
              [checked]="value() === option.value"
              (change)="valueChange.emit(option.value)"
            />
            <span class="font-medium">{{ option.label }}</span>
            @if (option.hint) {
              <span class="text-xs text-secondary">{{ option.hint }}</span>
            }
          </label>
        }
      </div>
    </fieldset>
  `,
})
export class OptionGroup<T extends string> {
  readonly legend = input.required<string>();
  readonly name = input.required<string>();
  readonly options = input.required<readonly OptionChoice<T>[]>();
  readonly value = input.required<T>();
  readonly columns = input(3);
  readonly valueChange = output<T>();
}

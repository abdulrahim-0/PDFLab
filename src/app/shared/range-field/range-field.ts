import { Component, input, output } from '@angular/core';

let nextId = 1;

/** A labelled slider that shows its current value. */
@Component({
  selector: 'app-range-field',
  host: { class: 'block' },
  template: `
    <div class="mb-1.5 flex items-baseline justify-between">
      <label class="text-sm font-semibold" [for]="id">{{ label() }}</label>
      <output class="text-xs text-secondary" [for]="id">{{ value() }}{{ unit() }}</output>
    </div>
    <input
      class="w-full accent-primary-container"
      type="range"
      [id]="id"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [value]="value()"
      [attr.aria-valuetext]="value() + unit()"
      (input)="valueChange.emit(+$any($event.target).value)"
    />
  `,
})
export class RangeField {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly min = input(0);
  readonly max = input(100);
  readonly step = input(1);
  readonly unit = input('');
  readonly valueChange = output<number>();

  protected readonly id = `range-${nextId++}`;
}

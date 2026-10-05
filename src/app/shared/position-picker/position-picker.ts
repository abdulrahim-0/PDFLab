import { Component, input, output } from '@angular/core';
import { BoxPosition, HorizontalAlign, VerticalAlign } from '../../core/pdf/placement';

const H_LABELS: Record<HorizontalAlign, string> = {
  left: 'left',
  center: 'center',
  right: 'right',
};
const V_LABELS: Record<VerticalAlign, string> = { top: 'Top', middle: 'Middle', bottom: 'Bottom' };

/** A grid of radio buttons for picking where something goes on the page. */
@Component({
  selector: 'app-position-picker',
  host: { class: 'block' },
  template: `
    <fieldset [disabled]="disabled()">
      <legend class="mb-2 text-sm font-semibold">{{ legend() }}</legend>
      <div
        class="grid w-36 grid-cols-3 gap-1.5 rounded-lg border border-outline-variant bg-surface p-1.5"
        [class.opacity-40]="disabled()"
      >
        @for (v of rows(); track v) {
          @for (h of columns; track h) {
            <label
              class="flex aspect-[4/3] cursor-pointer items-center justify-center rounded has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary-container"
              [class]="
                isSelected(v, h)
                  ? 'bg-primary-container'
                  : 'bg-surface-container hover:bg-surface-container-high'
              "
              [title]="label(v, h)"
            >
              <input
                class="sr-only"
                type="radio"
                [name]="name()"
                [checked]="isSelected(v, h)"
                [attr.aria-label]="label(v, h)"
                (change)="valueChange.emit({ v, h })"
              />
              <span
                class="size-1.5 rounded-full"
                [class]="isSelected(v, h) ? 'bg-on-primary' : 'bg-outline'"
                aria-hidden="true"
              ></span>
            </label>
          }
        }
      </div>
    </fieldset>
  `,
})
export class PositionPicker {
  readonly legend = input('Position');
  readonly name = input.required<string>();
  readonly value = input.required<BoxPosition>();
  readonly rows = input<readonly VerticalAlign[]>(['top', 'middle', 'bottom']);
  readonly disabled = input(false);
  readonly valueChange = output<BoxPosition>();

  protected readonly columns: readonly HorizontalAlign[] = ['left', 'center', 'right'];

  protected isSelected(v: VerticalAlign, h: HorizontalAlign): boolean {
    return this.value().v === v && this.value().h === h;
  }

  protected label(v: VerticalAlign, h: HorizontalAlign): string {
    return v === 'middle' && h === 'center' ? 'Center' : `${V_LABELS[v]} ${H_LABELS[h]}`;
  }
}

import { Component, input, output, signal } from '@angular/core';
import { Icon } from '../icon';

let nextId = 1;

/** A password input with a show/hide toggle and optional error text. */
@Component({
  selector: 'app-password-field',
  imports: [Icon],
  host: { class: 'block' },
  template: `
    <label class="mb-1.5 block text-sm font-semibold" [for]="id">{{ label() }}</label>
    <div class="relative">
      <input
        class="h-10 w-full rounded-lg border bg-surface pr-10 pl-3 text-sm"
        [class]="error() ? 'border-error' : 'border-outline-variant'"
        [id]="id"
        [type]="visible() ? 'text' : 'password'"
        [attr.autocomplete]="autocomplete()"
        [attr.placeholder]="placeholder() || null"
        [value]="value()"
        [attr.aria-invalid]="!!error()"
        [attr.aria-describedby]="error() || hint() ? id + '-help' : null"
        spellcheck="false"
        (input)="valueChange.emit($any($event.target).value)"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-secondary hover:text-on-surface"
        [attr.aria-label]="visible() ? 'Hide password' : 'Show password'"
        [attr.aria-pressed]="visible()"
        (click)="visible.set(!visible())"
      >
        <app-icon class="size-4" [name]="visible() ? 'eye-off' : 'eye'" />
      </button>
    </div>
    @if (error() || hint()) {
      <p
        class="mt-1.5 text-xs"
        [class]="error() ? 'text-error' : 'text-secondary'"
        [id]="id + '-help'"
      >
        {{ error() || hint() }}
      </p>
    }
  `,
})
export class PasswordField {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly autocomplete = input<'new-password' | 'current-password' | 'off'>('off');
  readonly placeholder = input('');
  readonly hint = input('');
  readonly error = input<string | null>(null);
  readonly valueChange = output<string>();

  protected readonly id = `password-${nextId++}`;
  protected readonly visible = signal(false);
}

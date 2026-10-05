import { Component, inject } from '@angular/core';
import { ToastService } from '../../core/toast/toast.service';
import { Icon } from '../icon';

@Component({
  selector: 'app-toast-outlet',
  imports: [Icon],
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg px-4 py-3 text-sm shadow-lg"
          [class]="
            toast.kind === 'error'
              ? 'bg-error-container text-on-error-container'
              : 'bg-inverse-surface text-inverse-on-surface'
          "
          [attr.role]="toast.kind === 'error' ? 'alert' : 'status'"
        >
          <app-icon
            class="mt-0.5 size-4"
            [name]="toast.kind === 'error' ? 'alert' : toast.kind === 'success' ? 'check' : 'file'"
          />
          <p class="flex-1">{{ toast.message }}</p>
          <button
            type="button"
            class="-m-1 rounded p-1 opacity-80 hover:opacity-100"
            aria-label="Dismiss notification"
            (click)="toastService.dismiss(toast.id)"
          >
            <app-icon class="size-4" name="close" />
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastOutlet {
  protected readonly toastService = inject(ToastService);
}

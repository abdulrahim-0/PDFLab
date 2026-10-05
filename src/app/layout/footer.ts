import { Component } from '@angular/core';
import { Icon } from '../shared/icon';

@Component({
  selector: 'app-footer',
  imports: [Icon],
  template: `
    <footer class="border-t border-outline-variant pb-[env(safe-area-inset-bottom)]">
      <div
        class="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-secondary sm:flex-row"
      >
        <p class="flex items-center gap-1.5">
          <app-icon class="size-4" name="lock" />
          Your files never leave your browser.
        </p>
        <p>© {{ year }} PDFLab</p>
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}

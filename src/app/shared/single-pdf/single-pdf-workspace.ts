import { Component, input, output } from '@angular/core';
import { FileList } from '../file-list/file-list';
import { SinglePdf } from './single-pdf';

/** Shows the chosen PDF, then the projected content once its pages are known. */
@Component({
  selector: 'app-single-pdf-workspace',
  imports: [FileList],
  host: { class: 'block' },
  template: `
    <app-file-list [items]="source().items()" (remove)="remove.emit()" />
    @switch (source().pageCountState().status) {
      @case ('loading') {
        <p class="mt-6 text-center text-sm text-secondary" role="status">Reading pages…</p>
      }
      @case ('error') {
        <p class="mt-6 text-center text-sm text-secondary">{{ errorHint() }}</p>
      }
      @case ('ready') {
        <div class="mt-6">
          <ng-content />
        </div>
      }
    }
  `,
})
export class SinglePdfWorkspace {
  readonly source = input.required<SinglePdf>();
  /** Shown instead of the default message when the PDF can’t be read. */
  readonly encryptedHint = input('This PDF is protected. Unlock it with Unlock PDF first.');
  readonly remove = output<void>();

  protected errorHint(): string {
    const state = this.source().pageCountState();
    return state.status === 'error' && state.encrypted
      ? this.encryptedHint()
      : 'This file couldn’t be read. Try a different PDF.';
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { PasswordField } from '../../shared/password-field/password-field';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

@Component({
  selector: 'app-unlock',
  imports: [FileDropzone, PasswordField, SinglePdfWorkspace, ToolPage],
  templateUrl: './unlock.html',
})
export class Unlock {
  private readonly pdf = inject(PdfService);

  protected readonly source = injectSinglePdf();
  protected readonly run = new ToolRun();
  protected readonly password = signal('');

  /** Files that need a password to open show up as "encrypted" when read. */
  protected readonly needsPassword = computed(() => {
    const state = this.source.pageCountState();
    return state.status === 'error' && state.encrypted;
  });
  protected readonly corrupt = computed(() => {
    const state = this.source.pageCountState();
    return state.status === 'error' && !state.encrypted;
  });
  protected readonly ready = computed(
    () => !this.corrupt() && (!this.needsPassword() || this.password().length > 0),
  );

  protected add([file]: File[]): void {
    this.run.reset();
    this.password.set('');
    this.source.set(file);
  }

  protected setPassword(value: string): void {
    this.password.set(value);
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }

  protected unlock(): Promise<void> {
    const file = this.source.file();
    if (!file || !this.ready()) {
      return Promise.resolve();
    }
    const password = this.password();
    return this.run.run((onProgress) => this.pdf.unlock(file, password, onProgress));
  }

  protected startOver(): void {
    this.source.clear();
    this.password.set('');
    this.run.reset();
  }
}

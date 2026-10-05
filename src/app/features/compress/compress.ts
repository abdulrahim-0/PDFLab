import { Component, inject, signal } from '@angular/core';
import { formatBytes } from '../../core/files/file-validation';
import type { CompressionLevel } from '../../core/pdf/ops/compress';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { Icon } from '../../shared/icon';
import { OptionGroup } from '../../shared/option-group/option-group';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

@Component({
  selector: 'app-compress',
  imports: [FileDropzone, Icon, OptionGroup, SinglePdfWorkspace, ToolPage],
  templateUrl: './compress.html',
})
export class Compress {
  private readonly pdf = inject(PdfService);

  protected readonly source = injectSinglePdf();
  protected readonly run = new ToolRun();
  protected readonly level = signal<CompressionLevel>('balanced');
  protected readonly formatBytes = formatBytes;

  protected readonly levels = [
    { value: 'light' as const, label: 'Light', hint: 'Best quality' },
    { value: 'balanced' as const, label: 'Balanced', hint: 'Recommended' },
    { value: 'strong' as const, label: 'Strong', hint: 'Smallest file' },
  ];

  protected add([file]: File[]): void {
    this.run.reset();
    this.source.set(file);
  }

  protected setLevel(level: CompressionLevel): void {
    this.level.set(level);
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }

  protected compress(): Promise<void> {
    const file = this.source.file();
    if (!file) {
      return Promise.resolve();
    }
    const level = this.level();
    return this.run.run((onProgress) => this.pdf.compress(file, level, onProgress));
  }

  protected startOver(): void {
    this.source.clear();
    this.run.reset();
  }
}

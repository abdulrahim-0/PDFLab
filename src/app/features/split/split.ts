import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { everyPage, PageRange, parsePageRanges } from '../../core/pdf/page-ranges';
import { PdfToolError } from '../../core/pdf/pdf-errors';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { OptionGroup } from '../../shared/option-group/option-group';
import { PageGrid } from '../../shared/page-grid/page-grid';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

export type SplitMode = 'ranges' | 'every-page';

@Component({
  selector: 'app-split',
  imports: [FileDropzone, OptionGroup, PageGrid, SinglePdfWorkspace, ToolPage],
  templateUrl: './split.html',
})
export class Split {
  private readonly pdf = inject(PdfService);

  protected readonly modes: readonly { value: SplitMode; label: string; hint: string }[] = [
    { value: 'ranges', label: 'Custom ranges', hint: 'Choose which pages' },
    { value: 'every-page', label: 'Every page', hint: 'One PDF per page' },
  ];
  protected readonly source = injectSinglePdf();
  protected readonly mode = signal<SplitMode>('ranges');
  /** Resets to the first page whenever a different file is chosen. */
  protected readonly rangeInput = linkedSignal<File | null, string>({
    source: this.source.file,
    computation: () => '1',
  });
  protected readonly run = new ToolRun();

  protected readonly parsed = computed<{ ranges: PageRange[] } | { error: string } | null>(() => {
    const count = this.source.pageCount();
    if (count === null) {
      return null;
    }
    if (this.mode() === 'every-page') {
      return { ranges: everyPage(count) };
    }
    try {
      return { ranges: parsePageRanges(this.rangeInput(), count) };
    } catch (error) {
      return { error: error instanceof PdfToolError ? error.message : 'Invalid page ranges.' };
    }
  });

  protected readonly ranges = computed(() => {
    const parsed = this.parsed();
    return parsed && 'ranges' in parsed ? parsed.ranges : [];
  });

  protected readonly rangeError = computed(() => {
    const parsed = this.parsed();
    return parsed && 'error' in parsed ? parsed.error : null;
  });

  /** Badge per page: which output file(s) it ends up in. */
  protected readonly marks = computed(() => {
    const marks = new Map<number, string>();
    this.ranges().forEach(({ start, end }, index) => {
      for (let page = start; page <= end; page++) {
        const existing = marks.get(page);
        marks.set(page, existing ? `${existing},${index + 1}` : `${index + 1}`);
      }
    });
    return marks;
  });

  protected readonly summary = computed(() => {
    const count = this.ranges().length;
    if (count === 0) {
      return '';
    }
    return count === 1 ? 'You’ll get 1 PDF.' : `You’ll get ${count} PDFs in a zip file.`;
  });

  protected add([file]: File[]): void {
    this.run.reset();
    this.source.set(file);
  }

  protected setMode(mode: SplitMode): void {
    this.mode.set(mode);
    this.clearError();
  }

  protected setRanges(value: string): void {
    this.rangeInput.set(value);
    this.clearError();
  }

  protected split(): Promise<void> {
    const file = this.source.file();
    const ranges = this.ranges();
    if (!file || ranges.length === 0) {
      return Promise.resolve();
    }
    return this.run.run((onProgress) => this.pdf.split(file, ranges, onProgress));
  }

  protected startOver(): void {
    this.source.clear();
    this.mode.set('ranges');
    this.run.reset();
  }

  private clearError(): void {
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }
}

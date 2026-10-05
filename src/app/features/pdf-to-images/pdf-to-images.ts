import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { pagesInRanges, parsePageRanges } from '../../core/pdf/page-ranges';
import { PdfToolError } from '../../core/pdf/pdf-errors';
import { PdfExportService } from '../../core/pdf/pdf-export.service';
import { ImageFormat } from '../../core/pdf/pdf-render.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { OptionGroup } from '../../shared/option-group/option-group';
import { PageGrid } from '../../shared/page-grid/page-grid';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

type PageChoice = 'all' | 'custom';
type Quality = '72' | '150' | '300';

@Component({
  selector: 'app-pdf-to-images',
  imports: [FileDropzone, OptionGroup, PageGrid, SinglePdfWorkspace, ToolPage],
  templateUrl: './pdf-to-images.html',
})
export class PdfToImages {
  private readonly exporter = inject(PdfExportService);

  protected readonly source = injectSinglePdf();
  protected readonly run = new ToolRun();
  protected readonly format = signal<ImageFormat>('jpeg');
  protected readonly quality = signal<Quality>('150');
  protected readonly pageChoice = signal<PageChoice>('all');
  protected readonly rangeInput = linkedSignal<File | null, string>({
    source: this.source.file,
    computation: () => '1',
  });

  protected readonly formats = [
    { value: 'jpeg' as const, label: 'JPG', hint: 'Smaller files' },
    { value: 'png' as const, label: 'PNG', hint: 'Sharpest text' },
  ];
  protected readonly qualities = [
    { value: '72' as const, label: 'Low', hint: '72 DPI' },
    { value: '150' as const, label: 'Medium', hint: '150 DPI' },
    { value: '300' as const, label: 'High', hint: '300 DPI' },
  ];
  protected readonly pageChoices = [
    { value: 'all' as const, label: 'All pages' },
    { value: 'custom' as const, label: 'Choose pages' },
  ];

  private readonly parsed = computed<{ pages: number[] } | { error: string } | null>(() => {
    const count = this.source.pageCount();
    if (count === null) {
      return null;
    }
    if (this.pageChoice() === 'all') {
      return { pages: Array.from({ length: count }, (_, i) => i + 1) };
    }
    try {
      return { pages: pagesInRanges(parsePageRanges(this.rangeInput(), count)) };
    } catch (error) {
      return { error: error instanceof PdfToolError ? error.message : 'Invalid page ranges.' };
    }
  });

  protected readonly pages = computed(() => {
    const parsed = this.parsed();
    return parsed && 'pages' in parsed ? parsed.pages : [];
  });
  protected readonly rangeError = computed(() => {
    const parsed = this.parsed();
    return parsed && 'error' in parsed ? parsed.error : null;
  });
  /** Highlights chosen pages only when the user is picking specific ones. */
  protected readonly marks = computed(() =>
    this.pageChoice() === 'custom' ? new Map(this.pages().map((page) => [page, '✓'])) : undefined,
  );
  protected readonly summary = computed(() => {
    const count = this.pages().length;
    const ext = this.format() === 'jpeg' ? 'JPG' : 'PNG';
    if (count === 0) {
      return '';
    }
    return count === 1
      ? `You’ll get 1 ${ext} image.`
      : `You’ll get ${count} ${ext} images in a zip file.`;
  });

  protected add([file]: File[]): void {
    this.run.reset();
    this.source.set(file);
  }

  protected set<T>(setter: (value: T) => void, value: T): void {
    setter(value);
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }

  protected convert(): Promise<void> {
    const file = this.source.file();
    const pages = this.pages();
    if (!file || pages.length === 0) {
      return Promise.resolve();
    }
    const options = { format: this.format(), dpi: Number(this.quality()) };
    return this.run.run((onProgress) =>
      this.exporter.pagesToImages(file, pages, options, onProgress),
    );
  }

  protected startOver(): void {
    this.source.clear();
    this.run.reset();
  }
}

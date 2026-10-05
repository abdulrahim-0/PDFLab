import { Component, computed, DestroyRef, inject, linkedSignal, signal } from '@angular/core';
import { everyPage, PageRange, parsePageRanges } from '../../core/pdf/page-ranges';
import { PdfToolError } from '../../core/pdf/pdf-errors';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { FileItem, toFileItems } from '../../shared/file-list/file-item';
import { FileList } from '../../shared/file-list/file-list';
import { PageGrid } from '../../shared/page-grid/page-grid';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

export type SplitMode = 'ranges' | 'every-page';

type PageCountState =
  { status: 'loading' } | { status: 'ready'; count: number } | { status: 'error' };

@Component({
  selector: 'app-split',
  imports: [FileDropzone, FileList, PageGrid, ToolPage],
  templateUrl: './split.html',
})
export class Split {
  private readonly pdf = inject(PdfService);
  private readonly renderer = inject(PdfRenderService);

  protected readonly modes: readonly { value: SplitMode; label: string; hint: string }[] = [
    { value: 'ranges', label: 'Custom ranges', hint: 'Choose which pages' },
    { value: 'every-page', label: 'Every page', hint: 'One PDF per page' },
  ];
  protected readonly item = signal<FileItem | null>(null);
  protected readonly items = computed(() => {
    const item = this.item();
    return item ? [item] : [];
  });
  protected readonly pageCount = signal<PageCountState>({ status: 'loading' });
  protected readonly mode = signal<SplitMode>('ranges');
  /** Defaults to the first page whenever a new file is loaded. */
  protected readonly rangeInput = linkedSignal<string>(() =>
    this.pageCount().status === 'ready' ? '1' : '',
  );
  protected readonly run = new ToolRun();

  protected readonly readyPageCount = computed(() => {
    const state = this.pageCount();
    return state.status === 'ready' ? state.count : null;
  });

  protected readonly parsed = computed<{ ranges: PageRange[] } | { error: string } | null>(() => {
    const state = this.pageCount();
    if (state.status !== 'ready') {
      return null;
    }
    if (this.mode() === 'every-page') {
      return { ranges: everyPage(state.count) };
    }
    try {
      return { ranges: parsePageRanges(this.rangeInput(), state.count) };
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

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  protected add([file]: File[]): void {
    this.release();
    this.run.reset();
    this.item.set(toFileItems([file])[0]);
    this.pageCount.set({ status: 'loading' });
    this.renderer.getPageCount(file).then(
      (count) => this.item()?.file === file && this.pageCount.set({ status: 'ready', count }),
      () => this.item()?.file === file && this.pageCount.set({ status: 'error' }),
    );
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
    const file = this.item()?.file;
    const ranges = this.ranges();
    if (!file || ranges.length === 0) {
      return Promise.resolve();
    }
    return this.run.run((onProgress) => this.pdf.split(file, ranges, onProgress));
  }

  protected startOver(): void {
    this.release();
    this.item.set(null);
    this.mode.set('ranges');
    this.run.reset();
  }

  private clearError(): void {
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }

  private release(): void {
    const file = this.item()?.file;
    if (file) {
      this.renderer.release(file);
    }
  }
}

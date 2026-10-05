import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import type { PageNumberOptions } from '../../core/pdf/ops/page-numbers';
import { formatPageNumber, NumberFormat } from '../../core/pdf/text-format';
import { BoxPosition } from '../../core/pdf/placement';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { OptionGroup } from '../../shared/option-group/option-group';
import { PositionPicker } from '../../shared/position-picker/position-picker';
import { RangeField } from '../../shared/range-field/range-field';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { PreviewMark, StampPreview } from '../../shared/stamp-preview/stamp-preview';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

type MarginSize = 'small' | 'medium' | 'large';

const MARGINS: Record<MarginSize, number> = { small: 18, medium: 36, large: 54 };
/** Approximate width of Helvetica digits and letters, for the preview only. */
const AVERAGE_CHAR_WIDTH = 0.55;

@Component({
  selector: 'app-page-numbers',
  imports: [
    FileDropzone,
    OptionGroup,
    PositionPicker,
    RangeField,
    SinglePdfWorkspace,
    StampPreview,
    ToolPage,
  ],
  templateUrl: './page-numbers.html',
})
export class PageNumbers {
  private readonly pdf = inject(PdfService);

  protected readonly source = injectSinglePdf();
  protected readonly run = new ToolRun();

  protected readonly position = signal<BoxPosition>({ v: 'bottom', h: 'center' });
  protected readonly format = signal<NumberFormat>('n');
  protected readonly fontSize = signal(11);
  protected readonly marginSize = signal<MarginSize>('medium');
  protected readonly startNumber = signal(1);
  /** Resets to page 1 for each new file. */
  protected readonly firstPage = linkedSignal<File | null, number>({
    source: this.source.file,
    computation: () => 1,
  });

  protected readonly formats = [
    { value: 'n' as const, label: '1' },
    { value: 'page-n' as const, label: 'Page 1' },
    { value: 'n-of-total' as const, label: '1 of 9' },
    { value: 'page-n-of-total' as const, label: 'Page 1 of 9' },
  ];
  protected readonly margins = [
    { value: 'small' as const, label: 'Small' },
    { value: 'medium' as const, label: 'Medium' },
    { value: 'large' as const, label: 'Large' },
  ];

  protected readonly firstPageError = computed(() => {
    const count = this.source.pageCount();
    const first = this.firstPage();
    if (count !== null && (!Number.isInteger(first) || first < 1 || first > count)) {
      return `Choose a page from 1 to ${count}.`;
    }
    return null;
  });
  protected readonly startNumberError = computed(() =>
    Number.isInteger(this.startNumber()) && this.startNumber() >= 0
      ? null
      : 'Use a whole number, 0 or more.',
  );
  protected readonly valid = computed(() => !this.firstPageError() && !this.startNumberError());

  protected readonly previewMark = computed<PreviewMark | null>(() => {
    const count = this.source.pageCount();
    if (count === null || !this.valid()) {
      return null;
    }
    const total = this.startNumber() + (count - this.firstPage());
    const text = formatPageNumber(this.format(), this.startNumber(), total);
    const size = this.fontSize();
    return {
      text,
      fontSize: size,
      color: '#000000',
      bold: false,
      opacity: 1,
      angle: 0,
      position: this.position(),
      tile: false,
      size: { width: text.length * size * AVERAGE_CHAR_WIDTH, height: size * 0.72 },
    };
  });
  protected readonly margin = computed(() => MARGINS[this.marginSize()]);

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

  protected apply(): Promise<void> {
    const file = this.source.file();
    if (!file || !this.valid()) {
      return Promise.resolve();
    }
    const options: PageNumberOptions = {
      position: this.position(),
      format: this.format(),
      startNumber: this.startNumber(),
      firstPage: this.firstPage(),
      fontSize: this.fontSize(),
      margin: this.margin(),
      color: '#000000',
    };
    return this.run.run((onProgress) => this.pdf.pageNumbers(file, options, onProgress));
  }

  protected startOver(): void {
    this.source.clear();
    this.run.reset();
  }
}

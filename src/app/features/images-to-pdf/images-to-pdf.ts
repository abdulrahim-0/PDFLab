import { Component, inject, signal } from '@angular/core';
import type {
  ImagesToPdfOptions,
  Margin,
  Orientation,
  PageSize,
} from '../../core/pdf/ops/images-to-pdf';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { FileItem, moveItem, ReorderEvent, toFileItems } from '../../shared/file-list/file-item';
import { FileList } from '../../shared/file-list/file-list';
import { OptionGroup } from '../../shared/option-group/option-group';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

export const MAX_IMAGES = 200;

@Component({
  selector: 'app-images-to-pdf',
  imports: [FileDropzone, FileList, OptionGroup, ToolPage],
  templateUrl: './images-to-pdf.html',
})
export class ImagesToPdf {
  private readonly pdf = inject(PdfService);

  protected readonly maxImages = MAX_IMAGES;
  protected readonly items = signal<FileItem[]>([]);
  protected readonly run = new ToolRun();
  protected readonly pageSize = signal<PageSize>('a4');
  protected readonly orientation = signal<Orientation>('auto');
  protected readonly margin = signal<Margin>('small');

  protected readonly pageSizes = [
    { value: 'a4' as const, label: 'A4' },
    { value: 'letter' as const, label: 'Letter' },
    { value: 'fit' as const, label: 'Fit image' },
  ];
  protected readonly orientations = [
    { value: 'auto' as const, label: 'Auto' },
    { value: 'portrait' as const, label: 'Portrait' },
    { value: 'landscape' as const, label: 'Landscape' },
  ];
  protected readonly margins = [
    { value: 'none' as const, label: 'None' },
    { value: 'small' as const, label: 'Small' },
    { value: 'large' as const, label: 'Large' },
  ];

  protected add(files: File[]): void {
    this.items.update((items) => [...items, ...toFileItems(files)]);
    this.clearError();
  }

  protected remove(id: string): void {
    this.items.update((items) => items.filter((i) => i.id !== id));
    this.clearError();
  }

  protected reorder(event: ReorderEvent): void {
    this.items.update((items) => moveItem(items, event));
  }

  protected set<T>(setter: (value: T) => void, value: T): void {
    setter(value);
    this.clearError();
  }

  protected convert(): Promise<void> {
    const files = this.items().map((item) => item.file);
    const options: ImagesToPdfOptions = {
      pageSize: this.pageSize(),
      orientation: this.orientation(),
      margin: this.margin(),
    };
    return this.run.run((onProgress) => this.pdf.imagesToPdf(files, options, onProgress));
  }

  protected startOver(): void {
    this.items.set([]);
    this.run.reset();
  }

  private clearError(): void {
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }
}

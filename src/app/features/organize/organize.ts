import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { moveItem, ReorderEvent } from '../../shared/file-list/file-item';
import { Icon } from '../../shared/icon';
import { PageGrid } from '../../shared/page-grid/page-grid';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

@Component({
  selector: 'app-organize',
  imports: [FileDropzone, Icon, PageGrid, SinglePdfWorkspace, ToolPage],
  templateUrl: './organize.html',
})
export class Organize {
  private readonly pdf = inject(PdfService);

  protected readonly source = injectSinglePdf();
  protected readonly run = new ToolRun();

  /** Page numbers in their new order, including deleted ones. Resets for each file. */
  protected readonly order = linkedSignal<number | null, number[]>({
    source: this.source.pageCount,
    computation: (count) => Array.from({ length: count ?? 0 }, (_, i) => i + 1),
  });
  protected readonly deleted = linkedSignal<number | null, ReadonlySet<number>>({
    source: this.source.pageCount,
    computation: () => new Set(),
  });
  protected readonly announcement = signal('');

  protected readonly kept = computed(() =>
    this.order().filter((page) => !this.deleted().has(page)),
  );
  protected readonly changed = computed(
    () => this.deleted().size > 0 || this.order().some((page, i) => page !== i + 1),
  );

  protected add([file]: File[]): void {
    this.run.reset();
    this.source.set(file);
  }

  protected reorder(event: ReorderEvent): void {
    this.order.update((order) => moveItem(order, event));
    this.announcement.set(
      `Page ${this.order()[event.to]} moved to position ${event.to + 1} of ${this.order().length}.`,
    );
    this.clearError();
  }

  protected move(index: number, to: number): void {
    if (to >= 0 && to < this.order().length) {
      this.reorder({ from: index, to });
    }
  }

  protected toggleDeleted(page: number): void {
    const next = new Set(this.deleted());
    const removing = !next.delete(page);
    if (removing) {
      next.add(page);
    }
    this.deleted.set(next);
    this.announcement.set(`Page ${page} ${removing ? 'will be deleted' : 'restored'}.`);
    this.clearError();
  }

  protected reverse(): void {
    this.order.update((order) => [...order].reverse());
    this.announcement.set('Page order reversed.');
    this.clearError();
  }

  protected reset(): void {
    this.order.set(Array.from({ length: this.source.pageCount() ?? 0 }, (_, i) => i + 1));
    this.deleted.set(new Set());
    this.announcement.set('Changes undone.');
    this.clearError();
  }

  protected organize(): Promise<void> {
    const file = this.source.file();
    const kept = this.kept();
    if (!file || kept.length === 0) {
      return Promise.resolve();
    }
    return this.run.run((onProgress) =>
      this.pdf.organize(
        file,
        kept.map((page) => page - 1),
        onProgress,
      ),
    );
  }

  protected startOver(): void {
    this.source.clear();
    this.run.reset();
  }

  private clearError(): void {
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }
}

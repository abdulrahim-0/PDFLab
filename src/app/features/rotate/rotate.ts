import { Component, computed, inject, signal } from '@angular/core';
import { normalizeRotation } from '../../core/pdf/ops/rotate';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { Icon } from '../../shared/icon';
import { PageGrid } from '../../shared/page-grid/page-grid';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

@Component({
  selector: 'app-rotate',
  imports: [FileDropzone, Icon, PageGrid, SinglePdfWorkspace, ToolPage],
  templateUrl: './rotate.html',
})
export class Rotate {
  private readonly pdf = inject(PdfService);

  protected readonly source = injectSinglePdf();
  protected readonly run = new ToolRun();
  /** Page number → clockwise degrees to add. Zero entries are removed. */
  protected readonly rotations = signal<ReadonlyMap<number, number>>(new Map());
  protected readonly changedCount = computed(() => this.rotations().size);

  protected add([file]: File[]): void {
    this.run.reset();
    this.rotations.set(new Map());
    this.source.set(file);
  }

  protected rotatePage(page: number, delta: number): void {
    this.rotations.update((current) => {
      const next = new Map(current);
      const angle = normalizeRotation((next.get(page) ?? 0) + delta);
      if (angle === 0) {
        next.delete(page);
      } else {
        next.set(page, angle);
      }
      return next;
    });
    this.clearError();
  }

  protected rotateAll(delta: number): void {
    const count = this.source.pageCount() ?? 0;
    for (let page = 1; page <= count; page++) {
      this.rotatePage(page, delta);
    }
  }

  protected reset(): void {
    this.rotations.set(new Map());
    this.clearError();
  }

  protected rotate(): Promise<void> {
    const file = this.source.file();
    if (!file || this.changedCount() === 0) {
      return Promise.resolve();
    }
    const byIndex: Record<number, number> = {};
    this.rotations().forEach((angle, page) => (byIndex[page - 1] = angle));
    return this.run.run((onProgress) => this.pdf.rotate(file, byIndex, onProgress));
  }

  protected startOver(): void {
    this.source.clear();
    this.rotations.set(new Map());
    this.run.reset();
  }

  private clearError(): void {
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }
}

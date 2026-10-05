import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { formatBytes } from '../../core/files/file-validation';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { FileItem, moveItem, ReorderEvent, toFileItems } from '../../shared/file-list/file-item';
import { FileList } from '../../shared/file-list/file-list';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';

export const MAX_MERGE_FILES = 50;

@Component({
  selector: 'app-merge',
  imports: [FileDropzone, FileList, ToolPage],
  templateUrl: './merge.html',
})
export class Merge {
  private readonly pdf = inject(PdfService);
  private readonly renderer = inject(PdfRenderService);

  protected readonly maxFiles = MAX_MERGE_FILES;
  protected readonly items = signal<FileItem[]>([]);
  protected readonly run = new ToolRun();
  protected readonly totalSize = computed(() =>
    formatBytes(this.items().reduce((sum, item) => sum + item.file.size, 0)),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releaseAll());
  }

  protected add(files: File[]): void {
    this.items.update((items) => [...items, ...toFileItems(files)]);
    this.clearError();
  }

  protected remove(id: string): void {
    const item = this.items().find((i) => i.id === id);
    this.items.update((items) => items.filter((i) => i.id !== id));
    if (item && !this.items().some((i) => i.file === item.file)) {
      this.renderer.release(item.file);
    }
    this.clearError();
  }

  protected reorder(event: ReorderEvent): void {
    this.items.update((items) => moveItem(items, event));
  }

  protected merge(): Promise<void> {
    const files = this.items().map((item) => item.file);
    return this.run.run(async (onProgress) => ({
      blob: await this.pdf.merge(files, onProgress),
      filename: 'merged.pdf',
    }));
  }

  protected startOver(): void {
    this.releaseAll();
    this.items.set([]);
    this.run.reset();
  }

  private clearError(): void {
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }

  private releaseAll(): void {
    for (const item of this.items()) {
      this.renderer.release(item.file);
    }
  }
}

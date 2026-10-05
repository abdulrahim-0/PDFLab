import { computed, DestroyRef, inject, signal } from '@angular/core';
import { PdfToolError } from '../../core/pdf/pdf-errors';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { FileItem, toFileItems } from '../file-list/file-item';

export type PageCountState =
  | { status: 'loading' }
  | { status: 'ready'; count: number }
  | { status: 'error'; encrypted: boolean };

/**
 * State for tools that work on one PDF at a time: the file, its page count,
 * and cleanup of its previews when it's replaced or the tool is closed.
 * Call `injectSinglePdf()` from a component field initializer.
 */
export class SinglePdf {
  private readonly current = signal<FileItem | null>(null);
  private readonly state = signal<PageCountState>({ status: 'loading' });

  readonly item = this.current.asReadonly();
  readonly items = computed(() => {
    const item = this.current();
    return item ? [item] : [];
  });
  readonly file = computed(() => this.current()?.file ?? null);
  readonly pageCountState = this.state.asReadonly();
  readonly pageCount = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.count : null;
  });
  readonly unreadable = computed(() => this.state().status === 'error');

  constructor(
    private readonly renderer: PdfRenderService,
    destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => this.release());
  }

  set(file: File): void {
    this.release();
    this.current.set(toFileItems([file])[0]);
    this.state.set({ status: 'loading' });
    this.renderer.getPageCount(file).then(
      (count) => this.file() === file && this.state.set({ status: 'ready', count }),
      (error: unknown) =>
        this.file() === file &&
        this.state.set({
          status: 'error',
          encrypted: error instanceof PdfToolError && error.code === 'encrypted',
        }),
    );
  }

  clear(): void {
    this.release();
    this.current.set(null);
  }

  private release(): void {
    const file = this.file();
    if (file) {
      this.renderer.release(file);
    }
  }
}

export function injectSinglePdf(): SinglePdf {
  return new SinglePdf(inject(PdfRenderService), inject(DestroyRef));
}

import { DestroyRef, inject, Injectable, InjectionToken } from '@angular/core';
import { OutputBytes, OutputFile, toOutputFile } from '../files/output-file';
import { PageRange } from './page-ranges';
import { PdfToolError } from './pdf-errors';
import { CompressionLevel } from './ops/compress';
import { ImagesToPdfOptions } from './ops/images-to-pdf';
import { NamedPdf, ProgressFn } from './ops/load';
import { PageNumberOptions } from './ops/page-numbers';
import { Watermark } from './ops/watermark';
import { PdfTask, PdfWorkerRequest, PdfWorkerResponse } from './pdf-worker-protocol';

export const PDF_WORKER_FACTORY = new InjectionToken<() => Worker>('PDF_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () => new Worker(new URL('./pdf.worker', import.meta.url), { type: 'module' }),
});

interface PendingTask {
  resolve: (output: OutputBytes) => void;
  reject: (error: Error) => void;
  onProgress?: ProgressFn;
}

/** Runs pdf-lib operations in a Web Worker so the UI never blocks. */
@Injectable({ providedIn: 'root' })
export class PdfService {
  private readonly createWorker = inject(PDF_WORKER_FACTORY);
  private readonly pending = new Map<number, PendingTask>();
  private worker?: Worker;
  private nextId = 1;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.terminate());
  }

  /** Combines the files, in order, into `merged.pdf`. */
  async merge(files: readonly File[], onProgress?: ProgressFn): Promise<OutputFile> {
    const named = await Promise.all(files.map(toNamed));
    return this.run({ type: 'merge', files: named }, named, onProgress);
  }

  /** One PDF per range; several results come back as a single zip. */
  async split(
    file: File,
    ranges: readonly PageRange[],
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const named = await toNamed(file);
    return this.run({ type: 'split', file: named, ranges: [...ranges] }, [named], onProgress);
  }

  /** Adds clockwise rotation to pages, keyed by 0-based page index. */
  async rotate(
    file: File,
    rotations: Readonly<Record<number, number>>,
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const named = await toNamed(file);
    return this.run(
      { type: 'rotate', file: named, rotations: { ...rotations } },
      [named],
      onProgress,
    );
  }

  /** Keeps only the given 0-based page indices, in that order. */
  async organize(
    file: File,
    order: readonly number[],
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const named = await toNamed(file);
    return this.run({ type: 'organize', file: named, order: [...order] }, [named], onProgress);
  }

  /** One page per image (JPG/PNG), in order. */
  async imagesToPdf(
    images: readonly File[],
    options: ImagesToPdfOptions,
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const named = await Promise.all(images.map(toNamed));
    return this.run(
      { type: 'images-to-pdf', images: named, options: { ...options } },
      named,
      onProgress,
    );
  }

  /** Stamps a text or image watermark on every page. */
  async watermark(file: File, watermark: Watermark, onProgress?: ProgressFn): Promise<OutputFile> {
    const named = await toNamed(file);
    const inputs = watermark.kind === 'image' ? [named, watermark.image] : [named];
    return this.run({ type: 'watermark', file: named, watermark }, inputs, onProgress);
  }

  async pageNumbers(
    file: File,
    options: PageNumberOptions,
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const named = await toNamed(file);
    return this.run(
      { type: 'page-numbers', file: named, options: { ...options } },
      [named],
      onProgress,
    );
  }

  /** Re-compresses photos and optimizes structure; returns the original if that's smaller. */
  async compress(
    file: File,
    level: CompressionLevel,
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const named = await toNamed(file);
    return this.run({ type: 'compress', file: named, level }, [named], onProgress);
  }

  /** Bundles finished files into one zip. */
  async zip(
    files: readonly OutputFile[],
    filename: string,
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const bytes: OutputBytes[] = await Promise.all(
      files.map(async ({ filename, blob }) => ({
        filename,
        mimeType: blob.type,
        data: new Uint8Array(await blob.arrayBuffer()),
      })),
    );
    return this.run({ type: 'zip', files: bytes, filename }, bytes, onProgress);
  }

  /** `inputs` have their buffers transferred to the worker (they become unusable here). */
  private async run(
    task: PdfTask,
    inputs: readonly { data: ArrayBuffer | Uint8Array }[],
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const worker = this.getWorker();
    const id = this.nextId++;
    const transfer = inputs.map(({ data }) => (data instanceof Uint8Array ? data.buffer : data));
    const output = await new Promise<OutputBytes>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      worker.postMessage({ id, task } satisfies PdfWorkerRequest, transfer);
    });
    return toOutputFile(output);
  }

  private getWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }
    const worker = this.createWorker();
    worker.addEventListener('message', ({ data }: MessageEvent<PdfWorkerResponse>) =>
      this.handleMessage(data),
    );
    worker.addEventListener('error', (event) => {
      event.preventDefault();
      this.terminate(new Error('The PDF engine stopped unexpectedly. Please try again.'));
    });
    this.worker = worker;
    return worker;
  }

  private handleMessage(message: PdfWorkerResponse): void {
    const task = this.pending.get(message.id);
    if (!task) {
      return;
    }
    switch (message.kind) {
      case 'progress':
        task.onProgress?.(message.value);
        return;
      case 'result':
        this.pending.delete(message.id);
        task.resolve(message.output);
        return;
      case 'error':
        this.pending.delete(message.id);
        task.reject(new PdfToolError(message.code, message.message));
        return;
    }
  }

  private terminate(reason = new Error('The PDF engine was shut down.')): void {
    this.worker?.terminate();
    this.worker = undefined;
    for (const task of this.pending.values()) {
      task.reject(reason);
    }
    this.pending.clear();
  }
}

async function toNamed(file: File): Promise<NamedPdf> {
  return { name: file.name, data: await file.arrayBuffer() };
}

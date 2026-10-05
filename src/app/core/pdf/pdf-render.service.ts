import { DOCUMENT, inject, Injectable } from '@angular/core';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { corruptError, encryptedError, PdfToolError } from './pdf-errors';

type PdfJs = typeof import('pdfjs-dist');

/**
 * Renders page previews with pdf.js. Parsing and decoding happen in pdf.js's
 * own worker; only the final canvas paint runs on the main thread, and renders
 * are queued one at a time so a long file list never floods it.
 */
@Injectable({ providedIn: 'root' })
export class PdfRenderService {
  private readonly document = inject(DOCUMENT);
  private pdfjs?: Promise<PdfJs>;
  private readonly docs = new Map<File, Promise<PDFDocumentProxy>>();
  private readonly thumbnails = new Map<File, Map<string, Promise<string>>>();
  private queue: Promise<unknown> = Promise.resolve();

  async getPageCount(file: File): Promise<number> {
    const doc = await this.open(file);
    return doc.numPages;
  }

  /** Returns an object URL for a JPEG of the page, `pixelWidth` pixels wide. */
  renderThumbnail(file: File, pageNumber: number, pixelWidth: number): Promise<string> {
    let cache = this.thumbnails.get(file);
    if (!cache) {
      cache = new Map();
      this.thumbnails.set(file, cache);
    }
    const key = `${pageNumber}@${Math.round(pixelWidth)}`;
    let url = cache.get(key);
    if (!url) {
      url = this.enqueue(() => this.render(file, pageNumber, pixelWidth));
      cache.set(key, url);
      url.catch(() => cache.delete(key));
    }
    return url;
  }

  /** Frees the parsed document and thumbnails for a file that's no longer shown. */
  release(file: File): void {
    const cache = this.thumbnails.get(file);
    this.thumbnails.delete(file);
    cache?.forEach((url) => url.then(URL.revokeObjectURL, () => undefined));

    const doc = this.docs.get(file);
    this.docs.delete(file);
    doc?.then((d) => d.loadingTask.destroy()).catch(() => undefined);
  }

  private async render(file: File, pageNumber: number, pixelWidth: number): Promise<string> {
    const doc = await this.open(file);
    const page = await doc.getPage(pageNumber);
    try {
      const scale = pixelWidth / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const canvas = this.document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.85),
      );
      if (!blob) {
        throw new Error('Canvas export failed');
      }
      return URL.createObjectURL(blob);
    } finally {
      page.cleanup();
    }
  }

  private open(file: File): Promise<PDFDocumentProxy> {
    let doc = this.docs.get(file);
    if (!doc) {
      doc = this.load(file);
      this.docs.set(file, doc);
      doc.catch(() => this.docs.delete(file));
    }
    return doc;
  }

  private async load(file: File): Promise<PDFDocumentProxy> {
    const pdfjs = await this.loadPdfJs();
    const assets = (path: string) => new URL(`pdfjs/${path}/`, this.document.baseURI).href;
    try {
      return await pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        cMapUrl: assets('cmaps'),
        cMapPacked: true,
        standardFontDataUrl: assets('standard_fonts'),
        wasmUrl: assets('wasm'),
        iccUrl: assets('iccs'),
      }).promise;
    } catch (error) {
      if (error instanceof pdfjs.PasswordException) {
        throw encryptedError(file.name);
      }
      if (error instanceof PdfToolError) {
        throw error;
      }
      throw corruptError(file.name);
    }
  }

  private loadPdfJs(): Promise<PdfJs> {
    this.pdfjs ??= import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerPort = new Worker(
        new URL('./pdfjs.worker', import.meta.url),
        { type: 'module' },
      );
      return pdfjs;
    });
    return this.pdfjs;
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const result = this.queue.then(job);
    this.queue = result.catch(() => undefined);
    return result;
  }
}

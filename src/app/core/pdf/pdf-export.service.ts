import { inject, Injectable } from '@angular/core';
import { baseName, OutputFile } from '../files/output-file';
import { ProgressFn } from './ops/load';
import { ImageFormat, PdfRenderService } from './pdf-render.service';
import { PdfService } from './pdf.service';

export interface PageImageOptions {
  format: ImageFormat;
  dpi: number;
}

const EXTENSIONS: Record<ImageFormat, string> = { jpeg: 'jpg', png: 'png' };

/**
 * Turns PDF pages into image files. Pages render one at a time with pdf.js;
 * several images are zipped in the PDF worker.
 */
@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private readonly renderer = inject(PdfRenderService);
  private readonly pdf = inject(PdfService);

  async pagesToImages(
    file: File,
    pages: readonly number[],
    { format, dpi }: PageImageOptions,
    onProgress?: ProgressFn,
  ): Promise<OutputFile> {
    const base = baseName(file.name);
    const images: OutputFile[] = [];
    for (const [index, page] of pages.entries()) {
      const blob = await this.renderer.renderPageImage(file, page, { dpi, format });
      images.push({ filename: `${base}-page-${page}.${EXTENSIONS[format]}`, blob });
      onProgress?.(((index + 1) / pages.length) * 0.9);
    }
    if (images.length === 1) {
      onProgress?.(1);
      return images[0];
    }
    return this.pdf.zip(images, `${base}-images.zip`, (p) => onProgress?.(0.9 + p * 0.1));
  }
}

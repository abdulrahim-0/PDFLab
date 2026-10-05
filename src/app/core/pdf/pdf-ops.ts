import { PDFDocument } from 'pdf-lib';
import { baseName, OutputBytes } from '../files/output-file';
import { formatRange, PageRange } from './page-ranges';
import { corruptError, encryptedError, PdfToolError } from './pdf-errors';

/**
 * Pure pdf-lib operations. These run inside the PDF worker, but have no
 * dependency on it so they can be unit tested directly.
 */

export interface NamedPdf {
  name: string;
  data: ArrayBuffer | Uint8Array;
}

export type ProgressFn = (fraction: number) => void;

export async function loadPdf(file: NamedPdf): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    // pdf-lib's EncryptedPDFError fails `instanceof` checks (ES5 build), so load
    // anyway and check `isEncrypted` instead.
    doc = await PDFDocument.load(file.data, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw corruptError(file.name);
  }
  if (doc.isEncrypted) {
    throw encryptedError(file.name);
  }
  if (doc.getPageCount() === 0) {
    throw corruptError(file.name);
  }
  return doc;
}

export async function mergePdfs(
  files: readonly NamedPdf[],
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new PdfToolError('invalid-input', 'Add at least one PDF to merge.');
  }

  const merged = await PDFDocument.create();
  merged.setProducer('PDFLab');
  merged.setCreator('PDFLab');

  // Saving is roughly as expensive as copying one file, so count it as a step.
  const steps = files.length + 1;
  for (const [index, file] of files.entries()) {
    const source = await loadPdf(file);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) {
      merged.addPage(page);
    }
    onProgress?.((index + 1) / steps);
  }

  const bytes = await merged.save();
  onProgress?.(1);
  return bytes;
}

/** Creates one PDF per range, named after the source file and the pages it holds. */
export async function splitPdf(
  file: NamedPdf,
  ranges: readonly PageRange[],
  onProgress?: ProgressFn,
): Promise<OutputBytes[]> {
  if (ranges.length === 0) {
    throw new PdfToolError('invalid-input', 'Choose at least one page range.');
  }
  const source = await loadPdf(file);
  const pageCount = source.getPageCount();
  const base = baseName(file.name);
  const outputs: OutputBytes[] = [];

  for (const [index, range] of ranges.entries()) {
    if (range.start < 1 || range.end > pageCount || range.end < range.start) {
      throw new PdfToolError('invalid-input', `Pages ${formatRange(range)} aren’t in this PDF.`);
    }
    const part = await PDFDocument.create();
    part.setProducer('PDFLab');
    part.setCreator('PDFLab');
    const indices = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start - 1 + i,
    );
    for (const page of await part.copyPages(source, indices)) {
      part.addPage(page);
    }
    const label = range.start === range.end ? `page-${range.start}` : `pages-${formatRange(range)}`;
    outputs.push({
      filename: `${base}-${label}.pdf`,
      mimeType: 'application/pdf',
      data: await part.save(),
    });
    onProgress?.((index + 1) / ranges.length);
  }
  return outputs;
}

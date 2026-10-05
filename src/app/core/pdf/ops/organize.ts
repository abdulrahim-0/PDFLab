import { OutputBytes } from '../../files/output-file';
import { PdfToolError } from '../pdf-errors';
import { assertPageIndex, createPdf, loadPdf, NamedPdf, ProgressFn, savePdf } from './load';

/** Builds a new PDF from the given 0-based page indices, in that order. Missing pages are dropped. */
export async function organizePdf(
  file: NamedPdf,
  order: readonly number[],
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  if (order.length === 0) {
    throw new PdfToolError('invalid-input', 'Keep at least one page.');
  }
  const source = await loadPdf(file);
  order.forEach((index) => assertPageIndex(source, index));

  const result = await createPdf();
  for (const page of await result.copyPages(source, [...order])) {
    result.addPage(page);
  }
  onProgress?.(0.5);
  const output = await savePdf(result, file.name, 'organized');
  onProgress?.(1);
  return output;
}

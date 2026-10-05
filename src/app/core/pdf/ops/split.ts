import { OutputBytes } from '../../files/output-file';
import { formatRange, PageRange } from '../page-ranges';
import { PdfToolError } from '../pdf-errors';
import { createPdf, loadPdf, NamedPdf, ProgressFn, savePdf } from './load';

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
  const outputs: OutputBytes[] = [];

  for (const [index, range] of ranges.entries()) {
    if (range.start < 1 || range.end > pageCount || range.end < range.start) {
      throw new PdfToolError('invalid-input', `Pages ${formatRange(range)} aren’t in this PDF.`);
    }
    const part = await createPdf();
    const indices = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start - 1 + i,
    );
    for (const page of await part.copyPages(source, indices)) {
      part.addPage(page);
    }
    const label = range.start === range.end ? `page-${range.start}` : `pages-${formatRange(range)}`;
    outputs.push(await savePdf(part, file.name, label));
    onProgress?.((index + 1) / ranges.length);
  }
  return outputs;
}

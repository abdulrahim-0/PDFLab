import { PdfToolError } from '../pdf-errors';
import { createPdf, loadPdf, NamedPdf, ProgressFn } from './load';

export async function mergePdfs(
  files: readonly NamedPdf[],
  onProgress?: ProgressFn,
): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new PdfToolError('invalid-input', 'Add at least one PDF to merge.');
  }

  const merged = await createPdf();

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

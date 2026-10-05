import { degrees } from '@cantoo/pdf-lib';
import { OutputBytes } from '../../files/output-file';
import { PdfToolError } from '../pdf-errors';
import { normalizeRotation } from '../rotation';
import { assertPageIndex, loadPdf, NamedPdf, ProgressFn, savePdf } from './load';

/**
 * Adds a clockwise rotation to pages, keyed by 0-based page index. Only the
 * page's /Rotate entry changes, so content is never re-encoded.
 */
export async function rotatePdf(
  file: NamedPdf,
  rotations: Readonly<Record<number, number>>,
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  const changes = Object.entries(rotations)
    .map(([index, angle]) => [Number(index), normalizeRotation(angle)] as const)
    .filter(([, angle]) => angle !== 0);
  if (changes.length === 0) {
    throw new PdfToolError('invalid-input', 'Rotate at least one page first.');
  }

  const doc = await loadPdf(file);
  for (const [index, angle] of changes) {
    assertPageIndex(doc, index);
    const page = doc.getPage(index);
    page.setRotation(degrees(normalizeRotation(page.getRotation().angle + angle)));
  }
  onProgress?.(0.5);
  const output = await savePdf(doc, file.name, 'rotated');
  onProgress?.(1);
  return output;
}

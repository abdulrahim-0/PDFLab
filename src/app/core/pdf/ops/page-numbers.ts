import { StandardFonts } from '@cantoo/pdf-lib';
import { OutputBytes } from '../../files/output-file';
import { BoxPosition, boxCenter } from '../placement';
import { PdfToolError } from '../pdf-errors';
import { NumberFormat } from '../text-format';
import { loadPdf, NamedPdf, ProgressFn, savePdf } from './load';
import { PageSpace } from './page-space';
import { hexToRgb } from './watermark';
import { formatPageNumber } from '../text-format';

export interface PageNumberOptions {
  position: BoxPosition;
  format: NumberFormat;
  /** Number shown on the first numbered page. */
  startNumber: number;
  /** 1-based page where numbering begins; earlier pages are left blank. */
  firstPage: number;
  fontSize: number;
  /** Distance from the page edge, in points. */
  margin: number;
  color: string;
}

export async function addPageNumbers(
  file: NamedPdf,
  options: PageNumberOptions,
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  const doc = await loadPdf(file);
  const pages = doc.getPages();
  const { firstPage, startNumber, format, fontSize, position, margin } = options;
  if (!Number.isInteger(firstPage) || firstPage < 1 || firstPage > pages.length) {
    throw new PdfToolError('invalid-input', `Start on a page between 1 and ${pages.length}.`);
  }
  if (!Number.isInteger(startNumber) || startNumber < 0) {
    throw new PdfToolError('invalid-input', 'The first number must be 0 or more.');
  }

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const style = { font, size: fontSize, color: hexToRgb(options.color), opacity: 1 };
  const total = startNumber + (pages.length - firstPage);

  pages.forEach((page, index) => {
    if (index + 1 >= firstPage) {
      const text = formatPageNumber(format, startNumber + index + 1 - firstPage, total);
      const space = new PageSpace(page);
      const width = font.widthOfTextAtSize(text, fontSize);
      const height = font.heightAtSize(fontSize, { descender: false }) * 0.72;
      const center = boxCenter(space.width, space.height, width, height, 0, position, margin);
      space.drawText(text, center, 0, style);
    }
    onProgress?.(((index + 1) / pages.length) * 0.8);
  });

  const output = await savePdf(doc, file.name, 'numbered');
  onProgress?.(1);
  return output;
}

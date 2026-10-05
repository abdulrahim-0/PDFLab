import { PdfToolError } from './pdf-errors';

/** An inclusive, 1-based page range. */
export interface PageRange {
  start: number;
  end: number;
}

/**
 * Parses input like `1-3, 5, 8-` into ranges. `8-` means "page 8 to the end".
 * Ranges may overlap; each one becomes its own output.
 */
export function parsePageRanges(input: string, pageCount: number): PageRange[] {
  const parts = input
    .split(/[,;]/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    throw rangeError('Enter at least one page or range, like 1-3, 5.');
  }
  return parts.map((part) => parseRange(part, pageCount));
}

function parseRange(part: string, pageCount: number): PageRange {
  const match = /^(\d+)\s*(?:[-–]\s*(\d*))?$/.exec(part);
  if (!match) {
    throw rangeError(`“${part}” isn’t a page number or range.`);
  }
  const start = Number(match[1]);
  const end = match[2] === undefined ? start : match[2] === '' ? pageCount : Number(match[2]);

  if (start < 1) {
    throw rangeError('Pages start at 1.');
  }
  if (start > pageCount || end > pageCount) {
    throw rangeError(
      `“${part}” goes past the last page. This PDF has ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}.`,
    );
  }
  if (end < start) {
    throw rangeError(`“${part}” is backwards. Did you mean ${end}-${start}?`);
  }
  return { start, end };
}

/** One range per page: 1, 2, 3… */
export function everyPage(pageCount: number): PageRange[] {
  return Array.from({ length: pageCount }, (_, i) => ({ start: i + 1, end: i + 1 }));
}

export function formatRange({ start, end }: PageRange): string {
  return start === end ? `${start}` : `${start}-${end}`;
}

function rangeError(message: string): PdfToolError {
  return new PdfToolError('invalid-input', message);
}

/** The pages covered by the ranges, without duplicates, in first-seen order. */
export function pagesInRanges(ranges: readonly PageRange[]): number[] {
  const pages = new Set<number>();
  for (const { start, end } of ranges) {
    for (let page = start; page <= end; page++) {
      pages.add(page);
    }
  }
  return [...pages];
}

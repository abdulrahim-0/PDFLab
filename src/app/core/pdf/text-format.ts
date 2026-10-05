/** Text helpers shared by the PDF operations and the UI. No pdf-lib here. */

/** Characters the built-in PDF fonts can draw (Windows-1252). */
const WIN_ANSI =
  /^[\u0020-\u007e\u00a0-\u00ff\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178]*$/;

export function isStandardFontText(text: string): boolean {
  return WIN_ANSI.test(text);
}

export type NumberFormat = 'n' | 'page-n' | 'n-of-total' | 'page-n-of-total';

export function formatPageNumber(format: NumberFormat, n: number, total: number): string {
  switch (format) {
    case 'n':
      return `${n}`;
    case 'page-n':
      return `Page ${n}`;
    case 'n-of-total':
      return `${n} of ${total}`;
    case 'page-n-of-total':
      return `Page ${n} of ${total}`;
  }
}

import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from '@cantoo/pdf-lib';
import { addPageNumbers, formatPageNumber, PageNumberOptions } from './page-numbers';
import { makePdf } from './testing';

const options: PageNumberOptions = {
  position: { v: 'bottom', h: 'center' },
  format: 'n',
  startNumber: 1,
  firstPage: 1,
  fontSize: 12,
  margin: 36,
  color: '#000000',
};

/** Text drawn on each page, decoded from the hex strings pdf-lib writes. */
async function drawnText(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  const decode = (object: unknown): string =>
    object instanceof PDFRawStream
      ? new TextDecoder('latin1').decode(decodePDFRawStream(object).decode())
      : '';
  return doc.getPages().map((page) => {
    const contents = page.node.Contents();
    const parts: unknown[] =
      contents instanceof PDFArray
        ? contents.asArray().map((ref) => doc.context.lookup(ref))
        : [contents];
    const content = parts.map(decode).join('');
    return [...content.matchAll(/<([0-9A-F]+)> Tj/g)]
      .map(([, hex]) =>
        (hex.match(/../g) ?? []).map((byte) => String.fromCharCode(parseInt(byte, 16))).join(''),
      )
      .join(' ');
  });
}

describe('formatPageNumber', () => {
  it.each([
    ['n', '3'],
    ['page-n', 'Page 3'],
    ['n-of-total', '3 of 9'],
    ['page-n-of-total', 'Page 3 of 9'],
  ] as const)('%s → %s', (format, expected) => {
    expect(formatPageNumber(format, 3, 9)).toBe(expected);
  });
});

describe('addPageNumbers', () => {
  it('numbers every page', async () => {
    const output = await addPageNumbers(
      { name: 'thesis.pdf', data: await makePdf(600, 600, 600) },
      { ...options, format: 'page-n-of-total' },
    );
    expect(output.filename).toBe('thesis-numbered.pdf');
    expect(await drawnText(output.data)).toEqual(['Page 1 of 3', 'Page 2 of 3', 'Page 3 of 3']);
  });

  it('can skip a cover page and start at another number', async () => {
    const output = await addPageNumbers(
      { name: 'a.pdf', data: await makePdf(600, 600, 600, 600) },
      { ...options, format: 'n-of-total', firstPage: 2, startNumber: 5 },
    );
    expect(await drawnText(output.data)).toEqual(['', '5 of 7', '6 of 7', '7 of 7']);
  });

  it('rejects a first page outside the document', async () => {
    const data = await makePdf(600, 600);
    await expect(
      addPageNumbers({ name: 'a.pdf', data }, { ...options, firstPage: 3 }),
    ).rejects.toThrow('Start on a page between 1 and 2.');
  });
});

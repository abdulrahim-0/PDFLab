import { PDFDocument } from 'pdf-lib';
import { PdfToolError } from './pdf-errors';
import { mergePdfs, splitPdf } from './pdf-ops';

/** Builds a PDF whose pages have the given widths, so order can be checked after merging. */
async function makePdf(...widths: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const width of widths) {
    doc.addPage([width, 800]);
  }
  return doc.save();
}

async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getWidth());
}

describe('mergePdfs', () => {
  it('combines all pages in the given file order', async () => {
    const merged = await mergePdfs([
      { name: 'a.pdf', data: await makePdf(100, 110) },
      { name: 'b.pdf', data: await makePdf(200) },
      { name: 'c.pdf', data: await makePdf(300, 310, 320) },
    ]);

    expect(await pageWidths(merged)).toEqual([100, 110, 200, 300, 310, 320]);
  });

  it('reports increasing progress that ends at 1', async () => {
    const progress: number[] = [];
    await mergePdfs(
      [
        { name: 'a.pdf', data: await makePdf(100) },
        { name: 'b.pdf', data: await makePdf(200) },
      ],
      (value) => progress.push(value),
    );

    expect(progress).toEqual([1 / 3, 2 / 3, 1]);
  });

  it('marks PDFLab as the producer', async () => {
    const merged = await mergePdfs([{ name: 'a.pdf', data: await makePdf(100) }]);
    const doc = await PDFDocument.load(merged, { updateMetadata: false });
    expect(doc.getProducer()).toBe('PDFLab');
  });

  it('rejects an empty file list', async () => {
    await expect(mergePdfs([])).rejects.toMatchObject({ code: 'invalid-input' });
  });

  it('names the file that is password-protected', async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    doc.context.trailerInfo.Encrypt = doc.context.register(doc.context.obj({ Filter: 'Standard' }));
    const encrypted = await doc.save();

    const result = mergePdfs([
      { name: 'ok.pdf', data: await makePdf(100) },
      { name: 'secret.pdf', data: encrypted },
    ]);

    await expect(result).rejects.toBeInstanceOf(PdfToolError);
    await expect(result).rejects.toMatchObject({ code: 'encrypted' });
    await expect(result).rejects.toThrow('“secret.pdf” is password-protected');
  });

  it('names the file that is corrupt', async () => {
    const garbage = new TextEncoder().encode('this is not a pdf at all');

    await expect(mergePdfs([{ name: 'broken.pdf', data: garbage }])).rejects.toMatchObject({
      code: 'corrupt',
      message: expect.stringContaining('“broken.pdf”'),
    });
  });
});

describe('splitPdf', () => {
  it('creates one PDF per range with the right pages and names', async () => {
    const source = { name: 'Report Q3.pdf', data: await makePdf(100, 200, 300, 400, 500) };

    const parts = await splitPdf(source, [
      { start: 1, end: 2 },
      { start: 4, end: 4 },
      { start: 2, end: 5 },
    ]);

    expect(parts.map((p) => p.filename)).toEqual([
      'Report Q3-pages-1-2.pdf',
      'Report Q3-page-4.pdf',
      'Report Q3-pages-2-5.pdf',
    ]);
    expect(parts.every((p) => p.mimeType === 'application/pdf')).toBe(true);
    expect(await pageWidths(parts[0].data)).toEqual([100, 200]);
    expect(await pageWidths(parts[1].data)).toEqual([400]);
    expect(await pageWidths(parts[2].data)).toEqual([200, 300, 400, 500]);
  });

  it('reports progress per range', async () => {
    const progress: number[] = [];
    await splitPdf(
      { name: 'a.pdf', data: await makePdf(100, 200) },
      [
        { start: 1, end: 1 },
        { start: 2, end: 2 },
      ],
      (p) => progress.push(p),
    );
    expect(progress).toEqual([0.5, 1]);
  });

  it('rejects ranges outside the document', async () => {
    const source = { name: 'a.pdf', data: await makePdf(100, 200) };
    await expect(splitPdf(source, [{ start: 2, end: 3 }])).rejects.toMatchObject({
      code: 'invalid-input',
    });
    await expect(splitPdf(source, [])).rejects.toMatchObject({ code: 'invalid-input' });
  });
});

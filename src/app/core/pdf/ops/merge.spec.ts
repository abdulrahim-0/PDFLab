import { PDFDocument } from '@cantoo/pdf-lib';
import { PdfToolError } from '../pdf-errors';
import { mergePdfs } from './merge';
import { makeEncryptedPdf, makePdf, pageWidths } from './testing';

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
    const encrypted = await makeEncryptedPdf();

    const result = mergePdfs([
      { name: 'ok.pdf', data: await makePdf(100) },
      { name: 'secret.pdf', data: encrypted },
    ]);

    await expect(result).rejects.toBeInstanceOf(PdfToolError);
    await expect(result).rejects.toMatchObject({ code: 'encrypted' });
    await expect(result).rejects.toThrow('“secret.pdf” is protected');
  });

  it('names the file that is corrupt', async () => {
    const garbage = new TextEncoder().encode('this is not a pdf at all');

    await expect(mergePdfs([{ name: 'broken.pdf', data: garbage }])).rejects.toMatchObject({
      code: 'corrupt',
      message: expect.stringContaining('“broken.pdf”'),
    });
  });
});

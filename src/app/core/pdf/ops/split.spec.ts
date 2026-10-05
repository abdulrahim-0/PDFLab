import { splitPdf } from './split';
import { makePdf, pageWidths } from './testing';

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

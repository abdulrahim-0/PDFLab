import { degrees, PDFDocument } from '@cantoo/pdf-lib';
import { normalizeRotation } from '../rotation';
import { rotatePdf } from './rotate';
import { makePdf } from './testing';

async function rotations(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getRotation().angle);
}

describe('normalizeRotation', () => {
  it.each([
    [0, 0],
    [90, 90],
    [-90, 270],
    [450, 90],
    [-540, 180],
    [360, 0],
  ])('%d → %d', (input, expected) => {
    expect(normalizeRotation(input)).toBe(expected);
  });
});

describe('rotatePdf', () => {
  it('rotates only the chosen pages and names the output', async () => {
    const output = await rotatePdf(
      { name: 'scan.pdf', data: await makePdf(100, 200, 300) },
      { 0: 90, 2: -90 },
    );
    expect(output.filename).toBe('scan-rotated.pdf');
    expect(await rotations(output.data)).toEqual([90, 0, 270]);
  });

  it('adds to a page’s existing rotation', async () => {
    const doc = await PDFDocument.create();
    doc.addPage().setRotation(degrees(270));
    const output = await rotatePdf({ name: 'a.pdf', data: await doc.save() }, { 0: 180 });
    expect(await rotations(output.data)).toEqual([90]);
  });

  it('rejects no-op rotations and missing pages', async () => {
    const data = await makePdf(100);
    await expect(rotatePdf({ name: 'a.pdf', data }, { 0: 360 })).rejects.toMatchObject({
      code: 'invalid-input',
    });
    await expect(rotatePdf({ name: 'a.pdf', data }, { 3: 90 })).rejects.toThrow(
      'Page 4 isn’t in this PDF.',
    );
  });
});

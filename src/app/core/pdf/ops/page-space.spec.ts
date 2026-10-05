import { degrees, PDFDocument } from '@cantoo/pdf-lib';
import { PageSpace } from './page-space';

async function pageWithRotation(rotation: number) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([200, 100]);
  page.setRotation(degrees(rotation));
  return new PageSpace(page);
}

describe('PageSpace', () => {
  it('swaps the visible size for sideways pages', async () => {
    const upright = await pageWithRotation(0);
    expect([upright.width, upright.height]).toEqual([200, 100]);
    const sideways = await pageWithRotation(90);
    expect([sideways.width, sideways.height]).toEqual([100, 200]);
  });

  // The visible bottom-left and top-right corners map to these user-space points.
  it.each([
    [0, { x: 0, y: 0 }, { x: 200, y: 100 }],
    [90, { x: 200, y: 0 }, { x: 0, y: 100 }],
    [180, { x: 200, y: 100 }, { x: 0, y: 0 }],
    [270, { x: 0, y: 100 }, { x: 200, y: 0 }],
  ])('maps corners on a page rotated %d°', async (rotation, bottomLeft, topRight) => {
    const space = await pageWithRotation(rotation);
    expect(space.toUserSpace({ x: 0, y: 0 })).toEqual(bottomLeft);
    expect(space.toUserSpace({ x: space.width, y: space.height })).toEqual(topRight);
  });
});

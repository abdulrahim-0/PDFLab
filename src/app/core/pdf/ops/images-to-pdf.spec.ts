import { PDFDocument } from '@cantoo/pdf-lib';
import { imagesToPdf, ImagesToPdfOptions } from './images-to-pdf';

// Tiny red PNGs, 1×1 and 2×1 pixels.
const png = (base64: string) => Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
const PNG_1x1 = png(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
);
const PNG_2x1 = png(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADUlEQVR4nGP4z8AARAAI/gH/xp559wAAAABJRU5ErkJggg==',
);

const fit: ImagesToPdfOptions = { pageSize: 'fit', orientation: 'auto', margin: 'none' };

async function pageSizes(bytes: Uint8Array): Promise<number[][]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);
}

describe('imagesToPdf', () => {
  it('makes one page per image, sized to the image', async () => {
    const output = await imagesToPdf(
      [
        { name: 'a.png', data: PNG_1x1 },
        { name: 'b.png', data: PNG_2x1 },
      ],
      { ...fit, margin: 'small' },
    );
    expect(output.filename).toBe('images.pdf');
    // 1px = 0.75pt, plus an 18pt margin each side.
    expect(await pageSizes(output.data)).toEqual([
      [37, 37],
      [38, 37],
    ]);
  });

  it('names a single-image PDF after the image', async () => {
    const output = await imagesToPdf([{ name: 'receipt.png', data: PNG_1x1 }], fit);
    expect(output.filename).toBe('receipt.pdf');
  });

  it('uses A4 and picks landscape for wide images', async () => {
    const output = await imagesToPdf([{ name: 'wide.png', data: PNG_2x1 }], {
      pageSize: 'a4',
      orientation: 'auto',
      margin: 'none',
    });
    expect(await pageSizes(output.data)).toEqual([[842, 595]]);
  });

  it('respects a forced orientation on Letter paper', async () => {
    const output = await imagesToPdf([{ name: 'wide.png', data: PNG_2x1 }], {
      pageSize: 'letter',
      orientation: 'portrait',
      margin: 'large',
    });
    expect(await pageSizes(output.data)).toEqual([[612, 792]]);
  });

  it('reports unreadable images by name', async () => {
    await expect(
      imagesToPdf([{ name: 'broken.png', data: PNG_1x1.slice(0, 20) }], fit),
    ).rejects.toThrow('“broken.png” couldn’t be read');
    await expect(imagesToPdf([], fit)).rejects.toThrow('Add at least one image.');
  });
});

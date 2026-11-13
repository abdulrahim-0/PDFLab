import { PDFDocument, PDFName, PDFRawStream } from '@cantoo/pdf-lib';
import { JpegEncoder } from './compress';
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

  describe('with a quality setting', () => {
    // A 16×16 JPEG.
    const JPEG = png(
      '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAAQABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDw+iiiv53P9ID/2Q==',
    );
    /** The JPEG padded with ignored bytes after its end marker, like a wasteful photo. */
    const bigPhoto = new Uint8Array(JPEG.length + 20_000);
    bigPhoto.set(JPEG);
    /** Pretends the source was 64×32 pixels and was scaled down to 16×16. */
    const shrink: JpegEncoder = async () => ({
      data: JPEG,
      width: 16,
      height: 16,
      sourceWidth: 64,
      sourceHeight: 32,
    });
    const balanced: ImagesToPdfOptions = { ...fit, quality: 'balanced' };

    async function imageSizes(bytes: Uint8Array): Promise<number[]> {
      const doc = await PDFDocument.load(bytes);
      return doc.context
        .enumerateIndirectObjects()
        .map(([, object]) => object)
        .filter(
          (object): object is PDFRawStream =>
            object instanceof PDFRawStream &&
            object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
        )
        .map((stream) => stream.contents.byteLength);
    }

    it('embeds the re-compressed image but keeps the page at the source size', async () => {
      const encode = vi.fn(shrink);
      const output = await imagesToPdf([{ name: 'photo.jpg', data: bigPhoto }], balanced, encode);

      expect(encode).toHaveBeenCalledWith(bigPhoto, { quality: 0.7, maxSide: 2000, type: 'jpeg' });
      expect(await imageSizes(output.data)).toEqual([JPEG.length]);
      expect(output.data.byteLength).toBeLessThan(bigPhoto.byteLength);
      expect(await pageSizes(output.data)).toEqual([[48, 24]]);
      expect(output.note).toMatch(/^Compressed 1 image: 2\d KB of images → .* PDF\.$/);
    });

    it('keeps the image as it is when re-compressing doesn’t save enough', async () => {
      const output = await imagesToPdf([{ name: 'small.jpg', data: JPEG }], balanced, shrink);
      expect(await imageSizes(output.data)).toEqual([JPEG.length]);
      expect(await pageSizes(output.data)).toEqual([[12, 12]]);
      expect(output.note).toBeUndefined();
    });

    it('falls back to the original when the encoder fails', async () => {
      const broken: JpegEncoder = async () => {
        throw new Error('decode failed');
      };
      const output = await imagesToPdf([{ name: 'photo.jpg', data: bigPhoto }], balanced, broken);
      expect(await imageSizes(output.data)).toEqual([bigPhoto.byteLength]);
    });

    it('leaves images untouched at original quality', async () => {
      const encode = vi.fn(shrink);
      const output = await imagesToPdf(
        [{ name: 'photo.jpg', data: bigPhoto }],
        { ...fit, quality: 'original' },
        encode,
      );
      expect(encode).not.toHaveBeenCalled();
      expect(await imageSizes(output.data)).toEqual([bigPhoto.byteLength]);
    });
  });

  it('reports unreadable images by name', async () => {
    await expect(
      imagesToPdf([{ name: 'broken.png', data: PNG_1x1.slice(0, 20) }], fit),
    ).rejects.toThrow('“broken.png” couldn’t be read');
    await expect(imagesToPdf([], fit)).rejects.toThrow('Add at least one image.');
  });
});

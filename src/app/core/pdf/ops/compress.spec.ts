import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from '@cantoo/pdf-lib';
import { compressPdf, JpegEncoder } from './compress';
import { makePdf } from './testing';

// A 16×16 JPEG.
const JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAIBAQEBAQIBAQECAgICAgQDAgICAgUEBAMEBgUGBgYFBgYGBwkIBgcJBwYGCAsICQoKCgoKBggLDAsKDAkKCgr/2wBDAQICAgICAgUDAwUKBwYHCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgr/wAARCAAQABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDw+iiiv53P9ID/2Q==',
  ),
  (c) => c.charCodeAt(0),
);

/** A PDF with one big, padded JPEG photo, saved without object streams. */
async function photoPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  // Pad the JPEG (bytes after EOI are ignored by decoders) so it's worth shrinking.
  const padded = new Uint8Array(JPEG.length + 20_000);
  padded.set(JPEG);
  const image = await doc.embedJpg(padded);
  doc.addPage([300, 300]).drawImage(image, { x: 0, y: 0, width: 300, height: 300 });
  return doc.save({ useObjectStreams: false });
}

function imageStreams(doc: PDFDocument): PDFRawStream[] {
  return doc.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter(
      (object): object is PDFRawStream =>
        object instanceof PDFRawStream &&
        object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
    );
}

describe('compressPdf', () => {
  const shrink: JpegEncoder = async (_jpeg, { maxSide }) => ({
    data: JPEG,
    width: Math.min(16, maxSide),
    height: Math.min(16, maxSide),
  });

  it('replaces photos with smaller re-encoded versions', async () => {
    const source = await photoPdf();
    const encode = vi.fn(shrink);
    const output = await compressPdf({ name: 'scan.pdf', data: source }, 'balanced', encode);

    expect(output.filename).toBe('scan-compressed.pdf');
    expect(output.data.byteLength).toBeLessThan(source.byteLength);
    expect(output.note).toMatch(/% smaller\). Re-compressed 1 photo\./);
    expect(encode).toHaveBeenCalledWith(expect.any(Uint8Array), { quality: 0.7, maxSide: 2000 });

    const [image] = imageStreams(await PDFDocument.load(output.data));
    expect(image.contents).toEqual(JPEG);
    expect((image.dict.get(PDFName.of('Width')) as PDFNumber).asNumber()).toBe(16);
  });

  it('keeps photos when re-encoding doesn’t save enough', async () => {
    const source = await photoPdf();
    const bigger: JpegEncoder = async () => ({
      data: new Uint8Array(30_000),
      width: 16,
      height: 16,
    });
    const output = await compressPdf({ name: 'a.pdf', data: source }, 'strong', bigger);
    const [image] = imageStreams(await PDFDocument.load(output.data));
    expect(image.contents.byteLength).toBe(JPEG.length + 20_000);
  });

  it('returns the original file when nothing gets smaller', async () => {
    const source = await makePdf(300);
    const output = await compressPdf({ name: 'text.pdf', data: source }, 'balanced', shrink);
    expect(output.data).toEqual(source);
    expect(output.note).toContain('no photos to shrink');
  });

  it('still optimizes structure without an encoder', async () => {
    const source = await photoPdf();
    const output = await compressPdf({ name: 'a.pdf', data: source }, 'balanced', null);
    expect(output.data.byteLength).toBeLessThanOrEqual(source.byteLength);
  });
});

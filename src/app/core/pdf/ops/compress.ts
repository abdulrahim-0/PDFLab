import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRawStream, PDFRef } from '@cantoo/pdf-lib';
import { baseName, OutputBytes } from '../../files/output-file';
import { formatBytes } from '../../files/file-validation';
import { dropStaleXrefStreams, loadPdf, NamedPdf, ProgressFn } from './load';

export type CompressionLevel = 'light' | 'balanced' | 'strong';

/** JPEG quality, and the longest side (pixels) photos are scaled down to. */
export const COMPRESSION_SETTINGS: Record<CompressionLevel, { quality: number; maxSide: number }> =
  {
    light: { quality: 0.85, maxSide: 3000 },
    balanced: { quality: 0.7, maxSide: 2000 },
    strong: { quality: 0.5, maxSide: 1400 },
  };

/**
 * Re-encodes a JPEG. Returns null if it can't (e.g. unsupported in this
 * browser). Kept as a parameter so tests can supply a fake.
 */
export type JpegEncoder = (
  jpeg: Uint8Array,
  options: { quality: number; maxSide: number },
) => Promise<{ data: Uint8Array; width: number; height: number } | null>;

/** Only re-encode when it saves at least this much, to avoid needless quality loss. */
const MIN_SAVING = 0.1;

/**
 * Shrinks a PDF in the browser by re-compressing its JPEG photos and saving
 * with compact object streams. Text and vector graphics are left untouched.
 * If the result isn't smaller, the original file is returned unchanged.
 */
export async function compressPdf(
  file: NamedPdf,
  level: CompressionLevel,
  encode: JpegEncoder | null,
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  const original = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
  const originalSize = original.byteLength;
  const doc = await loadPdf({ name: file.name, data: original.slice() });
  const settings = COMPRESSION_SETTINGS[level];

  const images = encode ? findJpegImages(doc.context.enumerateIndirectObjects()) : [];
  let recompressed = 0;
  for (const [index, { ref, stream }] of images.entries()) {
    // Soft masks are sized to their image, so only change quality for those.
    const maxSide = stream.dict.has(PDFName.of('SMask')) ? Infinity : settings.maxSide;
    const result = await encode!(stream.contents, { quality: settings.quality, maxSide }).catch(
      () => null,
    );
    if (result && result.data.byteLength < stream.contents.byteLength * (1 - MIN_SAVING)) {
      doc.context.assign(ref, replaceJpeg(doc.context, stream, result));
      recompressed++;
    }
    onProgress?.(((index + 1) / images.length) * 0.8);
  }

  dropStaleXrefStreams(doc);
  const data = await doc.save({ useObjectStreams: true });
  onProgress?.(1);

  const filename = `${baseName(file.name)}-compressed.pdf`;
  if (data.byteLength >= originalSize) {
    return {
      filename,
      mimeType: 'application/pdf',
      data: original,
      note:
        images.length === 0
          ? 'This PDF has no photos to shrink, and its structure is already compact, so you’re getting the original file back.'
          : 'This PDF is already well optimized, so you’re getting the original file back.',
    };
  }
  const saved = Math.round((1 - data.byteLength / originalSize) * 100);
  const photos = recompressed === 1 ? '1 photo' : `${recompressed} photos`;
  return {
    filename,
    mimeType: 'application/pdf',
    data,
    note: `${formatBytes(originalSize)} → ${formatBytes(data.byteLength)} (${saved}% smaller). ${
      recompressed > 0 ? `Re-compressed ${photos}.` : 'Optimized the file structure.'
    }`,
  };
}

interface JpegImage {
  ref: PDFRef;
  stream: PDFRawStream;
}

/** 8-bit RGB or grayscale JPEG images that a browser can safely re-encode. */
function findJpegImages(objects: [PDFRef, unknown][]): JpegImage[] {
  return objects
    .filter((entry): entry is [PDFRef, PDFRawStream] => entry[1] instanceof PDFRawStream)
    .map(([ref, stream]) => ({ ref, stream }))
    .filter(({ stream }) => isPlainJpeg(stream.dict));
}

function isPlainJpeg(dict: PDFDict): boolean {
  const name = (key: string) => dict.get(PDFName.of(key));
  if (name('Subtype') !== PDFName.of('Image')) {
    return false;
  }
  const filter = name('Filter');
  const isDct =
    filter === PDFName.of('DCTDecode') ||
    (filter instanceof PDFArray &&
      filter.size() === 1 &&
      filter.get(0) === PDFName.of('DCTDecode'));
  const bits = name('BitsPerComponent');
  return (
    isDct &&
    bits instanceof PDFNumber &&
    bits.asNumber() === 8 &&
    !name('Decode') &&
    !name('Mask') &&
    isRgbOrGray(dict, name('ColorSpace'))
  );
}

function isRgbOrGray(dict: PDFDict, colorSpace: unknown): boolean {
  if (colorSpace === PDFName.of('DeviceRGB') || colorSpace === PDFName.of('DeviceGray')) {
    return true;
  }
  // [/ICCBased <stream with /N 1 or 3>]
  if (colorSpace instanceof PDFArray && colorSpace.get(0) === PDFName.of('ICCBased')) {
    const profile = dict.context.lookup(colorSpace.get(1));
    const components =
      profile instanceof PDFRawStream ? profile.dict.get(PDFName.of('N')) : undefined;
    return components instanceof PDFNumber && [1, 3].includes(components.asNumber());
  }
  return false;
}

function replaceJpeg(
  context: PDFDict['context'],
  stream: PDFRawStream,
  { data, width, height }: { data: Uint8Array; width: number; height: number },
): PDFRawStream {
  const dict = stream.dict.clone(context);
  dict.set(PDFName.of('Width'), PDFNumber.of(width));
  dict.set(PDFName.of('Height'), PDFNumber.of(height));
  // Browsers always produce colour JPEGs.
  dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
  dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
  dict.set(PDFName.of('Length'), PDFNumber.of(data.byteLength));
  dict.delete(PDFName.of('DecodeParms'));
  return PDFRawStream.of(dict, data);
}

/** Re-encodes JPEGs with the browser's decoder, in a worker (OffscreenCanvas). */
export const browserJpegEncoder: JpegEncoder | null =
  typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined'
    ? null
    : async (jpeg, { quality, maxSide }) => {
        const bitmap = await createImageBitmap(
          new Blob([jpeg as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
          { imageOrientation: 'none' },
        );
        try {
          const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
          const width = Math.max(1, Math.round(bitmap.width * scale));
          const height = Math.max(1, Math.round(bitmap.height * scale));
          const canvas = new OffscreenCanvas(width, height);
          const context = canvas.getContext('2d');
          if (!context) {
            return null;
          }
          context.drawImage(bitmap, 0, 0, width, height);
          const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });
          return { data: new Uint8Array(await blob.arrayBuffer()), width, height };
        } finally {
          bitmap.close();
        }
      };

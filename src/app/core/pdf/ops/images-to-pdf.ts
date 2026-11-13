import { degrees, PDFDocument, PDFImage } from '@cantoo/pdf-lib';
import { readJpegOrientation } from '../../files/exif';
import { detectImageType, formatBytes } from '../../files/file-validation';
import { baseName, OutputBytes } from '../../files/output-file';
import { PdfToolError } from '../pdf-errors';
import { COMPRESSION_SETTINGS, CompressionLevel, JpegEncoder, MIN_SAVING } from './compress';
import { createPdf, ProgressFn } from './load';

export interface NamedImage {
  name: string;
  data: ArrayBuffer | Uint8Array;
}

export type PageSize = 'fit' | 'a4' | 'letter';
export type Orientation = 'auto' | 'portrait' | 'landscape';
export type Margin = 'none' | 'small' | 'large';
/** `original` embeds images untouched; the rest re-compress them to save space. */
export type ImageQuality = 'original' | CompressionLevel;

export interface ImagesToPdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
  margin: Margin;
  /** Defaults to `original`. */
  quality?: ImageQuality;
}

const PAGE_SIZES: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};
const MARGINS: Record<Margin, number> = { none: 0, small: 18, large: 36 };
/** Images are laid out at 96 pixels per inch when the page fits the image. */
const POINTS_PER_PIXEL = 0.75;

/** Clockwise rotation needed to show a JPEG upright, from its EXIF orientation. */
const EXIF_ROTATION: Record<number, number> = { 3: 180, 6: 90, 8: 270 };

interface EmbeddedImage {
  image: PDFImage;
  /** Clockwise rotation needed to show it upright. */
  rotation: number;
  /** Pixel size of the source image, which sets the page size even if it was scaled down. */
  width: number;
  height: number;
  recompressed: boolean;
}

/**
 * One page per image, in order. With a `quality` other than `original`, images
 * are re-compressed as JPEGs (and scaled down if very large) whenever that
 * makes them meaningfully smaller; otherwise they're embedded as-is.
 */
export async function imagesToPdf(
  images: readonly NamedImage[],
  options: ImagesToPdfOptions,
  encode: JpegEncoder | null = null,
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  if (images.length === 0) {
    throw new PdfToolError('invalid-input', 'Add at least one image.');
  }
  const doc = await createPdf();
  const steps = images.length + 1;
  const quality = options.quality ?? 'original';
  const settings = quality === 'original' ? null : COMPRESSION_SETTINGS[quality];
  let sourceSize = 0;
  let recompressed = 0;

  for (const [index, image] of images.entries()) {
    const bytes = image.data instanceof Uint8Array ? image.data : new Uint8Array(image.data);
    const embedded = await embed(
      doc,
      image.name,
      bytes,
      settings && encode ? { encode, settings } : null,
    );
    addImagePage(doc, embedded, options);
    sourceSize += bytes.byteLength;
    recompressed += embedded.recompressed ? 1 : 0;
    onProgress?.((index + 1) / steps);
  }

  const data = await doc.save();
  const output: OutputBytes = {
    filename: images.length === 1 ? `${baseName(images[0].name)}.pdf` : 'images.pdf',
    mimeType: 'application/pdf',
    data,
  };
  if (recompressed > 0) {
    const count = recompressed === 1 ? '1 image' : `${recompressed} images`;
    output.note = `Compressed ${count}: ${formatBytes(sourceSize)} of images → ${formatBytes(data.byteLength)} PDF.`;
  }
  onProgress?.(1);
  return output;
}

async function embed(
  doc: PDFDocument,
  name: string,
  bytes: Uint8Array,
  compression: {
    encode: JpegEncoder;
    settings: { quality: number; maxSide: number };
  } | null,
): Promise<EmbeddedImage> {
  const type = detectImageType(bytes);
  try {
    if (type) {
      // Re-encoding drops EXIF data, so read the orientation from the original.
      const rotation = type === 'jpeg' ? (EXIF_ROTATION[readJpegOrientation(bytes)] ?? 0) : 0;
      const smaller = compression
        ? await compression.encode(bytes, { ...compression.settings, type }).catch(() => null)
        : null;
      if (smaller && smaller.data.byteLength < bytes.byteLength * (1 - MIN_SAVING)) {
        const image = await doc.embedJpg(smaller.data);
        return {
          image,
          rotation,
          width: smaller.sourceWidth ?? image.width,
          height: smaller.sourceHeight ?? image.height,
          recompressed: true,
        };
      }
      const image = type === 'jpeg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes);
      return { image, rotation, width: image.width, height: image.height, recompressed: false };
    }
  } catch {
    // Fall through to the error below.
  }
  throw new PdfToolError('corrupt', `“${name}” couldn’t be read as a JPG or PNG image.`);
}

function addImagePage(
  doc: PDFDocument,
  { image, rotation, width, height }: EmbeddedImage,
  { pageSize, orientation, margin }: ImagesToPdfOptions,
): void {
  const sideways = rotation === 90 || rotation === 270;
  // Size of the image as it should appear, in points.
  const visualWidth = (sideways ? height : width) * POINTS_PER_PIXEL;
  const visualHeight = (sideways ? width : height) * POINTS_PER_PIXEL;
  const pad = MARGINS[margin];

  let pageWidth: number;
  let pageHeight: number;
  if (pageSize === 'fit') {
    pageWidth = visualWidth + pad * 2;
    pageHeight = visualHeight + pad * 2;
  } else {
    const [short, long] = PAGE_SIZES[pageSize];
    const landscape =
      orientation === 'landscape' || (orientation === 'auto' && visualWidth > visualHeight);
    [pageWidth, pageHeight] = landscape ? [long, short] : [short, long];
  }

  const scale = Math.min(
    (pageWidth - pad * 2) / visualWidth,
    (pageHeight - pad * 2) / visualHeight,
  );
  const drawWidth = visualWidth * scale;
  const drawHeight = visualHeight * scale;
  const left = (pageWidth - drawWidth) / 2;
  const bottom = (pageHeight - drawHeight) / 2;

  const page = doc.addPage([pageWidth, pageHeight]);
  // pdf-lib rotates counter-clockwise around (x, y), so pick the corner that
  // keeps the rotated image inside the target box.
  const raw = sideways
    ? { width: drawHeight, height: drawWidth }
    : { width: drawWidth, height: drawHeight };
  const anchor: Record<number, [number, number]> = {
    0: [left, bottom],
    90: [left, bottom + drawHeight],
    180: [left + drawWidth, bottom + drawHeight],
    270: [left + drawWidth, bottom],
  };
  const [x, y] = anchor[rotation];
  page.drawImage(image, { x, y, ...raw, rotate: degrees(-rotation) });
}

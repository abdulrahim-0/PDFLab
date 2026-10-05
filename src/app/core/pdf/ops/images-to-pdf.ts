import { degrees, PDFDocument, PDFImage } from '@cantoo/pdf-lib';
import { readJpegOrientation } from '../../files/exif';
import { detectImageType } from '../../files/file-validation';
import { baseName, OutputBytes } from '../../files/output-file';
import { PdfToolError } from '../pdf-errors';
import { createPdf, ProgressFn } from './load';

export interface NamedImage {
  name: string;
  data: ArrayBuffer | Uint8Array;
}

export type PageSize = 'fit' | 'a4' | 'letter';
export type Orientation = 'auto' | 'portrait' | 'landscape';
export type Margin = 'none' | 'small' | 'large';

export interface ImagesToPdfOptions {
  pageSize: PageSize;
  orientation: Orientation;
  margin: Margin;
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

/** One page per image, in order. JPEGs are embedded as-is (no re-encoding). */
export async function imagesToPdf(
  images: readonly NamedImage[],
  options: ImagesToPdfOptions,
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  if (images.length === 0) {
    throw new PdfToolError('invalid-input', 'Add at least one image.');
  }
  const doc = await createPdf();
  const steps = images.length + 1;

  for (const [index, image] of images.entries()) {
    const bytes = image.data instanceof Uint8Array ? image.data : new Uint8Array(image.data);
    const { embedded, rotation } = await embed(doc, image.name, bytes);
    addImagePage(doc, embedded, rotation, options);
    onProgress?.((index + 1) / steps);
  }

  const output: OutputBytes = {
    filename: images.length === 1 ? `${baseName(images[0].name)}.pdf` : 'images.pdf',
    mimeType: 'application/pdf',
    data: await doc.save(),
  };
  onProgress?.(1);
  return output;
}

async function embed(
  doc: PDFDocument,
  name: string,
  bytes: Uint8Array,
): Promise<{ embedded: PDFImage; rotation: number }> {
  const type = detectImageType(bytes);
  try {
    if (type === 'jpeg') {
      return {
        embedded: await doc.embedJpg(bytes),
        rotation: EXIF_ROTATION[readJpegOrientation(bytes)] ?? 0,
      };
    }
    if (type === 'png') {
      return { embedded: await doc.embedPng(bytes), rotation: 0 };
    }
  } catch {
    // Fall through to the error below.
  }
  throw new PdfToolError('corrupt', `“${name}” couldn’t be read as a JPG or PNG image.`);
}

function addImagePage(
  doc: PDFDocument,
  image: PDFImage,
  rotation: number,
  { pageSize, orientation, margin }: ImagesToPdfOptions,
): void {
  const sideways = rotation === 90 || rotation === 270;
  // Size of the image as it should appear, in points.
  const visualWidth = (sideways ? image.height : image.width) * POINTS_PER_PIXEL;
  const visualHeight = (sideways ? image.width : image.height) * POINTS_PER_PIXEL;
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

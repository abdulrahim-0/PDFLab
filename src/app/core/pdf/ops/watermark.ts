import { PDFImage, rgb, StandardFonts } from '@cantoo/pdf-lib';
import { detectImageType } from '../../files/file-validation';
import { OutputBytes } from '../../files/output-file';
import { BoxPosition, boxCenter, Point, tileCenters } from '../placement';
import { PdfToolError } from '../pdf-errors';
import { isStandardFontText } from '../text-format';
import { loadPdf, NamedPdf, ProgressFn, savePdf } from './load';
import { PageSpace } from './page-space';

export interface WatermarkLayout {
  position: BoxPosition;
  /** Repeat across the page instead of placing once. */
  tile: boolean;
  /** Degrees counter-clockwise, as seen by the reader. */
  angle: number;
  /** 0–1. */
  opacity: number;
}

export interface TextWatermark extends WatermarkLayout {
  kind: 'text';
  text: string;
  fontSize: number;
  /** `#rrggbb`. */
  color: string;
}

export interface ImageWatermark extends WatermarkLayout {
  kind: 'image';
  image: { name: string; data: ArrayBuffer | Uint8Array };
  /** Either a fraction of the page width, or a fixed width in points. */
  width: { fraction: number } | { points: number };
}

export type Watermark = TextWatermark | ImageWatermark;

const MARGIN = 36;

export function hexToRgb(hex: string) {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) {
    return rgb(0.5, 0.5, 0.5);
  }
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  return rgb(r, g, b);
}

/** Stamps text or an image on every page, above the existing content. */
export async function watermarkPdf(
  file: NamedPdf,
  watermark: Watermark,
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  const doc = await loadPdf(file);
  const pages = doc.getPages();

  let draw: (space: PageSpace) => void;
  if (watermark.kind === 'text') {
    const text = watermark.text.trim();
    if (!text) {
      throw new PdfToolError('invalid-input', 'Enter the watermark text.');
    }
    if (!isStandardFontText(text)) {
      throw new PdfToolError('invalid-input', 'This text needs a font that isn’t built in.');
    }
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const style = {
      font,
      size: watermark.fontSize,
      color: hexToRgb(watermark.color),
      opacity: watermark.opacity,
    };
    const width = font.widthOfTextAtSize(text, watermark.fontSize);
    const height = font.heightAtSize(watermark.fontSize, { descender: false }) * 0.72;
    draw = (space) => {
      for (const center of centers(space, width, height, watermark)) {
        space.drawText(text, center, watermark.angle, style);
      }
    };
  } else {
    const image = await embedImage(doc, watermark.image);
    draw = (space) => {
      const w =
        'fraction' in watermark.width
          ? space.width * watermark.width.fraction
          : watermark.width.points;
      const h = (w * image.height) / image.width;
      for (const center of centers(space, w, h, watermark)) {
        space.drawImage(image, center, w, h, watermark.angle, watermark.opacity);
      }
    };
  }

  pages.forEach((page, index) => {
    draw(new PageSpace(page));
    onProgress?.(((index + 1) / pages.length) * 0.8);
  });
  const output = await savePdf(doc, file.name, 'watermarked');
  onProgress?.(1);
  return output;
}

function centers(space: PageSpace, w: number, h: number, layout: WatermarkLayout): Point[] {
  return layout.tile
    ? tileCenters(space.width, space.height, w, h, layout.angle)
    : [boxCenter(space.width, space.height, w, h, layout.angle, layout.position, MARGIN)];
}

async function embedImage(
  doc: Awaited<ReturnType<typeof loadPdf>>,
  { name, data }: ImageWatermark['image'],
): Promise<PDFImage> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  try {
    switch (detectImageType(bytes)) {
      case 'jpeg':
        return await doc.embedJpg(bytes);
      case 'png':
        return await doc.embedPng(bytes);
    }
  } catch {
    // Fall through.
  }
  throw new PdfToolError('corrupt', `“${name}” couldn’t be read as a JPG or PNG image.`);
}

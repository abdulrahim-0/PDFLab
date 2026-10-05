import { degrees, PDFFont, PDFImage, PDFPage, RGB } from '@cantoo/pdf-lib';
import { originForCenter, Point } from '../placement';
import { normalizeRotation } from '../rotation';

/**
 * Bridges what the reader sees and PDF user space. A page with /Rotate is
 * displayed turned, so placing something "at the top" means a different
 * corner of the underlying page, and text must be counter-rotated to read upright.
 */
export class PageSpace {
  readonly rotation: number;
  readonly width: number;
  readonly height: number;
  private readonly box: { x: number; y: number; width: number; height: number };

  constructor(readonly page: PDFPage) {
    this.rotation = normalizeRotation(page.getRotation().angle);
    this.box = page.getCropBox();
    const sideways = this.rotation === 90 || this.rotation === 270;
    this.width = sideways ? this.box.height : this.box.width;
    this.height = sideways ? this.box.width : this.box.height;
  }

  /** Converts a point as displayed (origin bottom-left) to PDF user space. */
  toUserSpace({ x: u, y: v }: Point): Point {
    const { x, y, width, height } = this.box;
    switch (this.rotation) {
      case 90:
        return { x: x + width - v, y: y + u };
      case 180:
        return { x: x + width - u, y: y + height - v };
      case 270:
        return { x: x + v, y: y + height - u };
      default:
        return { x: x + u, y: y + v };
    }
  }

  /** Draws text so it appears centered on `center`, turned `angle`° counter-clockwise. */
  drawText(
    text: string,
    center: Point,
    angle: number,
    { font, size, color, opacity }: { font: PDFFont; size: number; color: RGB; opacity: number },
  ): void {
    const width = font.widthOfTextAtSize(text, size);
    // Center on the cap height so text looks vertically centered.
    const capHeight = font.heightAtSize(size, { descender: false }) * 0.72;
    const origin = this.toUserSpace(originForCenter(center, width, capHeight, angle));
    this.page.drawText(text, {
      ...origin,
      size,
      font,
      color,
      opacity,
      rotate: degrees(angle + this.rotation),
    });
  }

  /** Draws an image w×h (points) centered on `center`, turned `angle`° counter-clockwise. */
  drawImage(
    image: PDFImage,
    center: Point,
    w: number,
    h: number,
    angle: number,
    opacity: number,
  ): void {
    const origin = this.toUserSpace(originForCenter(center, w, h, angle));
    this.page.drawImage(image, {
      ...origin,
      width: w,
      height: h,
      opacity,
      rotate: degrees(angle + this.rotation),
    });
  }
}

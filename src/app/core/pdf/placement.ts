/**
 * Pure geometry for placing boxes (text, images) on a page as the reader sees
 * it: origin bottom-left, angles in degrees counter-clockwise. Shared by the
 * PDF operations and the on-screen previews.
 */

export type VerticalAlign = 'top' | 'middle' | 'bottom';
export type HorizontalAlign = 'left' | 'center' | 'right';

export interface BoxPosition {
  v: VerticalAlign;
  h: HorizontalAlign;
}

export interface Point {
  x: number;
  y: number;
}

/** Half the width and height of a w×h box's bounding box after rotation. */
export function rotatedExtents(w: number, h: number, angle: number): { ex: number; ey: number } {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return { ex: (w * cos + h * sin) / 2, ey: (w * sin + h * cos) / 2 };
}

/** Center for a rotated box so it sits at `position`, `margin` from the page edges. */
export function boxCenter(
  pageWidth: number,
  pageHeight: number,
  w: number,
  h: number,
  angle: number,
  { v, h: horizontal }: BoxPosition,
  margin: number,
): Point {
  const { ex, ey } = rotatedExtents(w, h, angle);
  const x =
    horizontal === 'left'
      ? margin + ex
      : horizontal === 'right'
        ? pageWidth - margin - ex
        : pageWidth / 2;
  const y = v === 'bottom' ? margin + ey : v === 'top' ? pageHeight - margin - ey : pageHeight / 2;
  return { x, y };
}

/**
 * Centers for repeating a rotated box across the whole page. Copies at the
 * edges may be cut off, the way tiled watermarks usually look.
 */
export function tileCenters(
  pageWidth: number,
  pageHeight: number,
  w: number,
  h: number,
  angle: number,
): Point[] {
  const { ex, ey } = rotatedExtents(w, h, angle);
  const gap = 24;
  const stepX = ex * 2 + gap;
  const stepY = ey * 2 + gap;
  const columns = Math.ceil(pageWidth / stepX) + 1;
  const rows = Math.ceil(pageHeight / stepY) + 1;
  const offsetX = (pageWidth - (columns - 1) * stepX) / 2;
  const offsetY = (pageHeight - (rows - 1) * stepY) / 2;
  const centers: Point[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      centers.push({ x: offsetX + column * stepX, y: offsetY + row * stepY });
    }
  }
  return centers;
}

/** Bottom-left corner of a w×h box rotated by `angle` around `center`. */
export function originForCenter(center: Point, w: number, h: number, angle: number): Point {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: center.x - (w / 2) * cos + (h / 2) * sin,
    y: center.y - (w / 2) * sin - (h / 2) * cos,
  };
}

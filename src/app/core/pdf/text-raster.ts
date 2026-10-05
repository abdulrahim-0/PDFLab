/** Renders at this many pixels per point, so rasterized text stays sharp in print. */
const PIXELS_PER_POINT = 4;

export interface RasterizedText {
  png: Uint8Array;
  /** Width and height the image should have on the page, in points. */
  width: number;
  height: number;
}

/**
 * Draws text with the browser's own fonts, which cover every script and handle
 * shaping and right-to-left text. Used when the built-in PDF fonts can't.
 */
export async function rasterizeText(
  text: string,
  { fontSize, color }: { fontSize: number; color: string },
  doc: Document = document,
): Promise<RasterizedText> {
  const px = fontSize * PIXELS_PER_POINT;
  const font = `bold ${px}px system-ui, "Segoe UI", "Noto Sans", sans-serif`;
  const canvas = doc.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available');
  }
  context.font = font;
  const metrics = context.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent || px * 0.8;
  const descent = metrics.actualBoundingBoxDescent || px * 0.2;
  canvas.width = Math.ceil(metrics.width) + 2;
  canvas.height = Math.ceil(ascent + descent) + 2;

  // Resizing resets the context, so set the style again.
  context.font = font;
  context.fillStyle = color;
  context.textBaseline = 'alphabetic';
  context.fillText(text, 1, ascent + 1);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('Could not render the text');
  }
  return {
    png: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width / PIXELS_PER_POINT,
    height: canvas.height / PIXELS_PER_POINT,
  };
}

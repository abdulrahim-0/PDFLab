/** Wraps any angle into 0, 90, 180 or 270. */
export function normalizeRotation(angle: number): number {
  return (((Math.round(angle / 90) * 90) % 360) + 360) % 360;
}

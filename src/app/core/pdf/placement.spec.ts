import { boxCenter, originForCenter, rotatedExtents, tileCenters } from './placement';

describe('placement', () => {
  it('measures rotated boxes', () => {
    expect(rotatedExtents(100, 20, 0)).toEqual({ ex: 50, ey: 10 });
    const r90 = rotatedExtents(100, 20, 90);
    expect(r90.ex).toBeCloseTo(10);
    expect(r90.ey).toBeCloseTo(50);
  });

  it.each([
    [
      { v: 'top', h: 'left' },
      { x: 60, y: 780 },
    ],
    [
      { v: 'middle', h: 'center' },
      { x: 300, y: 400 },
    ],
    [
      { v: 'bottom', h: 'right' },
      { x: 540, y: 20 },
    ],
  ] as const)('places a box at %o', (position, expected) => {
    expect(boxCenter(600, 800, 100, 20, 0, position, 10)).toEqual(expected);
  });

  it('finds the corner to draw from for a rotated box', () => {
    const origin = originForCenter({ x: 0, y: 0 }, 100, 20, 0);
    expect(origin).toEqual({ x: -50, y: -10 });
    const turned = originForCenter({ x: 0, y: 0 }, 100, 20, 90);
    expect(turned.x).toBeCloseTo(10);
    expect(turned.y).toBeCloseTo(-50);
  });

  it('tiles copies over the whole page, centered', () => {
    const centers = tileCenters(600, 800, 100, 20, 0);
    const xs = centers.map((c) => c.x);
    const ys = centers.map((c) => c.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(50);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(550);
    expect(Math.min(...ys)).toBeLessThanOrEqual(10);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(790);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(300);
  });

  it('tiles big diagonal text more than once', () => {
    expect(tileCenters(600, 800, 450, 43, 45).length).toBeGreaterThan(4);
  });
});

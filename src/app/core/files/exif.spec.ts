import { readJpegOrientation } from './exif';

/** A minimal JPEG prefix with an EXIF block holding just the orientation tag. */
export function jpegWithOrientation(orientation: number, littleEndian = false): Uint8Array {
  const tiff = new DataView(new ArrayBuffer(26));
  tiff.setUint16(0, littleEndian ? 0x4949 : 0x4d4d);
  tiff.setUint16(2, 42, littleEndian);
  tiff.setUint32(4, 8, littleEndian);
  tiff.setUint16(8, 1, littleEndian); // one IFD entry
  tiff.setUint16(10, 0x0112, littleEndian);
  tiff.setUint16(12, 3, littleEndian); // SHORT
  tiff.setUint32(14, 1, littleEndian);
  tiff.setUint16(18, orientation, littleEndian);
  const exif = [...new TextEncoder().encode('Exif'), 0, 0, ...new Uint8Array(tiff.buffer)];
  const length = exif.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, length >> 8, length & 0xff, ...exif, 0xff, 0xda]);
}

describe('readJpegOrientation', () => {
  it.each([1, 3, 6, 8])('reads orientation %d (big endian)', (orientation) => {
    expect(readJpegOrientation(jpegWithOrientation(orientation))).toBe(orientation);
  });

  it('reads little-endian EXIF', () => {
    expect(readJpegOrientation(jpegWithOrientation(6, true))).toBe(6);
  });

  it('defaults to 1 without EXIF or for non-JPEG data', () => {
    expect(readJpegOrientation(new Uint8Array([0xff, 0xd8, 0xff, 0xda]))).toBe(1);
    expect(readJpegOrientation(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
    expect(readJpegOrientation(new Uint8Array([]))).toBe(1);
  });

  it('ignores out-of-range values and truncated data', () => {
    expect(readJpegOrientation(jpegWithOrientation(42))).toBe(1);
    expect(readJpegOrientation(jpegWithOrientation(6).slice(0, 20))).toBe(1);
  });
});

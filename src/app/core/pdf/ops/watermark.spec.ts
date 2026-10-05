import { decodePDFRawStream, degrees, PDFDocument, PDFRawStream } from '@cantoo/pdf-lib';
import { isStandardFontText } from '../text-format';
import { hexToRgb, TextWatermark, watermarkPdf } from './watermark';
import { makePdf } from './testing';

const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  ),
  (c) => c.charCodeAt(0),
);

const text: TextWatermark = {
  kind: 'text',
  text: 'CONFIDENTIAL',
  fontSize: 48,
  color: '#ff0000',
  opacity: 0.3,
  angle: 45,
  position: { v: 'middle', h: 'center' },
  tile: false,
};

/** Every decodable stream in the file, as text, to check what was drawn. */
async function content(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  return doc.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter((object): object is PDFRawStream => object instanceof PDFRawStream)
    .map((stream) => {
      try {
        return new TextDecoder('latin1').decode(decodePDFRawStream(stream).decode());
      } catch {
        return '';
      }
    })
    .join('\n');
}

describe('watermarkPdf', () => {
  it('stamps text on every page', async () => {
    const output = await watermarkPdf({ name: 'memo.pdf', data: await makePdf(600, 600) }, text);
    expect(output.filename).toBe('memo-watermarked.pdf');
    const drawn = await content(output.data);
    expect(drawn.match(/Tj/g)).toHaveLength(2);
    expect(drawn).toMatch(/1 0 0 rg/); // red fill
  });

  it('repeats a tiled watermark', async () => {
    const output = await watermarkPdf(
      { name: 'a.pdf', data: await makePdf(600) },
      { ...text, fontSize: 12, tile: true },
    );
    expect((await content(output.data)).match(/Tj/g)!.length).toBeGreaterThan(4);
  });

  it('counter-rotates for pages displayed sideways', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([600, 800]).setRotation(degrees(90));
    const output = await watermarkPdf(
      { name: 'a.pdf', data: await doc.save() },
      { ...text, angle: 0 },
    );
    const drawn = await content(output.data);
    // Rotation matrix for 90°: cos ≈ 0 (written as a tiny float), sin = 1.
    expect(drawn).toMatch(/\n[\d.e-]+ 1 -1 [\d.e-]+ [\d.]+ [\d.]+ Tm/);
  });

  it('stamps an image', async () => {
    const output = await watermarkPdf(
      { name: 'a.pdf', data: await makePdf(600) },
      {
        kind: 'image',
        image: { name: 'logo.png', data: PNG },
        width: { fraction: 0.5 },
        opacity: 0.5,
        angle: 0,
        position: { v: 'bottom', h: 'right' },
        tile: false,
      },
    );
    expect(await content(output.data)).toContain(' Do');
  });

  it('rejects empty text, unsupported characters and bad images', async () => {
    const data = await makePdf(600);
    await expect(watermarkPdf({ name: 'a.pdf', data }, { ...text, text: '  ' })).rejects.toThrow(
      'Enter the watermark text.',
    );
    await expect(watermarkPdf({ name: 'a.pdf', data }, { ...text, text: 'سري' })).rejects.toThrow(
      'isn’t built in',
    );
    await expect(
      watermarkPdf(
        { name: 'a.pdf', data },
        {
          ...text,
          kind: 'image',
          image: { name: 'x.png', data: new Uint8Array([1, 2, 3]) },
          width: { fraction: 0.5 },
        },
      ),
    ).rejects.toThrow('“x.png” couldn’t be read');
  });
});

describe('helpers', () => {
  it('detects text the standard fonts can draw', () => {
    expect(isStandardFontText('Draft – “Café” €5')).toBe(true);
    expect(isStandardFontText('سري')).toBe(false);
    expect(isStandardFontText('机密')).toBe(false);
  });

  it('parses hex colours', () => {
    expect(hexToRgb('#3366ff')).toEqual({ type: 'RGB', red: 0.2, green: 0.4, blue: 1 });
  });
});

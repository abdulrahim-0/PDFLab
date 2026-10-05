import JSZip from 'jszip';
import { zipOutputs } from './zip';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('zipOutputs', () => {
  it('bundles files and keeps duplicate names apart', async () => {
    const progress: number[] = [];
    const zip = await zipOutputs(
      [
        { filename: 'a.pdf', mimeType: 'application/pdf', data: bytes('one') },
        { filename: 'a.pdf', mimeType: 'application/pdf', data: bytes('two') },
        { filename: 'b.pdf', mimeType: 'application/pdf', data: bytes('three') },
      ],
      'out.zip',
      (p) => progress.push(p),
    );

    expect(zip.filename).toBe('out.zip');
    expect(zip.mimeType).toBe('application/zip');
    expect(progress.at(-1)).toBe(1);

    const contents = await JSZip.loadAsync(zip.data);
    expect(Object.keys(contents.files)).toEqual(['a.pdf', 'a (2).pdf', 'b.pdf']);
    expect(await contents.file('a (2).pdf')!.async('string')).toBe('two');
  });
});

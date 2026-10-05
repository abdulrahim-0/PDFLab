import { TestBed } from '@angular/core/testing';
import { PdfService } from '../../core/pdf/pdf.service';
import { clickButton, dropFiles } from '../../shared/testing';
import { ImagesToPdf } from './images-to-pdf';

const jpeg = (name: string) =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], name, { type: 'image/jpeg' });

describe('ImagesToPdf', () => {
  const imagesToPdf = vi.fn<PdfService['imagesToPdf']>();

  beforeEach(() => {
    imagesToPdf.mockReset();
    imagesToPdf.mockResolvedValue({ filename: 'images.pdf', blob: new Blob(['x']) });
    TestBed.configureTestingModule({
      providers: [{ provide: PdfService, useValue: { imagesToPdf } }],
    });
  });

  async function setup(...names: string[]) {
    const fixture = TestBed.createComponent(ImagesToPdf);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, names.map(jpeg));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('app-file-list li').length).toBe(names.length);
    });
    return { fixture, element };
  }

  it('shows image previews instead of page counts', async () => {
    const { element } = await setup('a.jpg');
    expect(element.querySelector('app-image-thumbnail img')).not.toBeNull();
    expect(element.querySelector('app-pdf-thumbnail')).toBeNull();
    expect(element.querySelector('app-file-list')!.textContent).not.toMatch(/page/i);
  });

  it('converts images in the chosen order with the chosen options', async () => {
    const { fixture, element } = await setup('a.jpg', 'b.jpg');

    clickButton(element, 'Move b.jpg up');
    element.querySelector<HTMLInputElement>('input[name=page-size][value=letter]')!.click();
    element.querySelector<HTMLInputElement>('input[name=orientation][value=landscape]')!.click();
    element.querySelector<HTMLInputElement>('input[name=margin][value=none]')!.click();
    await fixture.whenStable();

    clickButton(element, 'Convert to PDF');
    await fixture.whenStable();

    const [files, options] = imagesToPdf.mock.calls[0];
    expect(files.map((f) => f.name)).toEqual(['b.jpg', 'a.jpg']);
    expect(options).toEqual({ pageSize: 'letter', orientation: 'landscape', margin: 'none' });
  });

  it('hides orientation when pages fit the image', async () => {
    const { fixture, element } = await setup('a.jpg');
    element.querySelector<HTMLInputElement>('input[name=page-size][value=fit]')!.click();
    await fixture.whenStable();
    expect(element.querySelector('input[name=orientation]')).toBeNull();
  });
});

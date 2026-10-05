import { TestBed } from '@angular/core/testing';
import { PdfExportService } from '../../core/pdf/pdf-export.service';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { clickButton, dropFiles, fakeRenderer, pdfFile } from '../../shared/testing';
import { PdfToImages } from './pdf-to-images';

describe('PdfToImages', () => {
  const pagesToImages = vi.fn<PdfExportService['pagesToImages']>();

  beforeEach(() => {
    pagesToImages.mockReset();
    pagesToImages.mockResolvedValue({ filename: 'doc-images.zip', blob: new Blob(['x']) });
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfExportService, useValue: { pagesToImages } },
        { provide: PdfRenderService, useValue: fakeRenderer(5) },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(PdfToImages);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, [pdfFile('doc.pdf')]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('app-page-grid li').length).toBe(5);
    });
    return { fixture, element };
  }

  const choose = (element: HTMLElement, name: string, value: string) =>
    element.querySelector<HTMLInputElement>(`input[name=${name}][value="${value}"]`)!.click();

  it('converts every page as medium-quality JPG by default', async () => {
    const { fixture, element } = await setup();
    expect(element.textContent).toContain('You’ll get 5 JPG images in a zip file.');

    clickButton(element, 'Convert to images');
    await fixture.whenStable();

    expect(pagesToImages.mock.calls[0].slice(1, 3)).toEqual([
      [1, 2, 3, 4, 5],
      { format: 'jpeg', dpi: 150 },
    ]);
  });

  it('converts chosen pages with the chosen format and resolution', async () => {
    const { fixture, element } = await setup();
    choose(element, 'format', 'png');
    choose(element, 'quality', '300');
    choose(element, 'pages', 'custom');
    await fixture.whenStable();

    const input = element.querySelector<HTMLInputElement>('#image-pages')!;
    input.value = '4-5, 2';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.textContent).toContain('You’ll get 3 PNG images');

    clickButton(element, 'Convert to images');
    await fixture.whenStable();
    expect(pagesToImages.mock.calls[0].slice(1, 3)).toEqual([
      [4, 5, 2],
      { format: 'png', dpi: 300 },
    ]);
  });

  it('blocks invalid page choices', async () => {
    const { fixture, element } = await setup();
    choose(element, 'pages', 'custom');
    await fixture.whenStable();
    const input = element.querySelector<HTMLInputElement>('#image-pages')!;
    input.value = '9';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(element.querySelector('#image-pages-help')!.textContent).toContain('past the last page');
    expect(clickButton(element, 'Convert to images', { dryRun: true }).disabled).toBe(true);
  });
});

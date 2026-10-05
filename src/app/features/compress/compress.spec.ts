import { TestBed } from '@angular/core/testing';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { clickButton, dropFiles, fakeRenderer, pdfFile } from '../../shared/testing';
import { Compress } from './compress';

describe('Compress', () => {
  const compress = vi.fn<PdfService['compress']>();

  beforeEach(() => {
    compress.mockReset();
    compress.mockResolvedValue({
      filename: 'scan-compressed.pdf',
      blob: new Blob(['x']),
      note: '2 MB → 1 MB (50% smaller). Re-compressed 3 photos.',
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { compress } },
        { provide: PdfRenderService, useValue: fakeRenderer(3) },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(Compress);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, [pdfFile('scan.pdf')]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.textContent).toContain('What compression can do here');
    });
    return { fixture, element };
  }

  it('explains its limits and compresses at the chosen level', async () => {
    const { fixture, element } = await setup();
    expect(element.textContent).toContain('Text-only PDFs are usually already small');

    element.querySelector<HTMLInputElement>('input[name=compression-level][value=strong]')!.click();
    await fixture.whenStable();
    clickButton(element, 'Compress PDF');
    await fixture.whenStable();

    expect(compress.mock.calls[0][1]).toBe('strong');
    expect(element.textContent).toContain('50% smaller');
  });

  it('defaults to balanced', async () => {
    const { fixture, element } = await setup();
    clickButton(element, 'Compress PDF');
    await fixture.whenStable();
    expect(compress.mock.calls[0][1]).toBe('balanced');
  });
});

import { TestBed } from '@angular/core/testing';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { Rotate } from './rotate';
import { clickButton, dropFiles, fakeRenderer, pdfFile } from '../../shared/testing';

describe('Rotate', () => {
  const rotate = vi.fn<PdfService['rotate']>();

  beforeEach(() => {
    rotate.mockReset();
    rotate.mockResolvedValue({ filename: 'scan-rotated.pdf', blob: new Blob(['x']) });
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { rotate } },
        { provide: PdfRenderService, useValue: fakeRenderer(3) },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(Rotate);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, [pdfFile('scan.pdf')]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('app-page-grid li').length).toBe(3);
    });
    return { fixture, element };
  }

  it('needs a rotation before it can run', async () => {
    const { element } = await setup();
    expect(clickButton(element, 'Rotate PDF', { dryRun: true }).disabled).toBe(true);
  });

  it('rotates single pages and previews the rotation', async () => {
    const { fixture, element } = await setup();

    clickButton(element, 'Rotate page 2 right');
    clickButton(element, 'Rotate page 3 left');
    await fixture.whenStable();

    const thumbs = element.querySelectorAll('app-page-grid app-pdf-thumbnail');
    expect(Array.from(thumbs, (t) => t.getAttribute('data-rotation'))).toEqual([null, '90', '270']);
    expect(element.textContent).toContain('2 pages will be rotated.');

    clickButton(element, 'Rotate PDF');
    await fixture.whenStable();
    expect(rotate.mock.calls[0][1]).toEqual({ 1: 90, 2: 270 });
    expect(element.textContent).toContain('scan-rotated.pdf');
  });

  it('rotates every page, and a full turn cancels out', async () => {
    const { fixture, element } = await setup();

    clickButton(element, 'Right');
    await fixture.whenStable();
    expect(element.textContent).toContain('3 pages will be rotated.');

    for (let i = 0; i < 3; i++) {
      clickButton(element, 'Right');
    }
    await fixture.whenStable();
    expect(element.textContent).toContain('No pages rotated yet.');
  });
});

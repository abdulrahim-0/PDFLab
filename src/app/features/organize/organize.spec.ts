import { TestBed } from '@angular/core/testing';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { clickButton, dropFiles, fakeRenderer, pdfFile } from '../../shared/testing';
import { Organize } from './organize';

describe('Organize', () => {
  const organize = vi.fn<PdfService['organize']>();

  beforeEach(() => {
    organize.mockReset();
    organize.mockResolvedValue({ filename: 'deck-organized.pdf', blob: new Blob(['x']) });
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { organize } },
        { provide: PdfRenderService, useValue: fakeRenderer(4) },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(Organize);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, [pdfFile('deck.pdf')]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('app-page-grid li').length).toBe(4);
    });
    return { fixture, element };
  }

  const pageOrder = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('app-page-grid li > span'), (s) => s.textContent?.trim());

  it('starts unchanged', async () => {
    const { element } = await setup();
    expect(clickButton(element, 'Save changes', { dryRun: true }).disabled).toBe(true);
    expect(element.textContent).toContain('Keeping 4 of 4 pages.');
  });

  it('moves and deletes pages, then saves the kept order', async () => {
    const { fixture, element } = await setup();

    clickButton(element, 'Move page 4 earlier');
    await fixture.whenStable();
    clickButton(element, 'Delete page 1');
    await fixture.whenStable();

    expect(pageOrder(element)).toEqual(['1', '2', '4', '3']);
    const faded = Array.from(element.querySelectorAll('app-page-grid li > div:first-child'), (d) =>
      d.classList.contains('opacity-35'),
    );
    expect(faded).toEqual([true, false, false, false]);
    expect(element.textContent).toContain('Keeping 3 of 4 pages.');
    expect(element.querySelector('#organize-status')?.textContent).toContain(
      'Page 1 will be deleted.',
    );

    clickButton(element, 'Save changes');
    await fixture.whenStable();
    expect(organize.mock.calls[0][1]).toEqual([1, 3, 2]);
  });

  it('restores deleted pages and resets', async () => {
    const { fixture, element } = await setup();

    clickButton(element, 'Delete page 2');
    await fixture.whenStable();
    clickButton(element, 'Restore page 2');
    clickButton(element, 'Reverse');
    await fixture.whenStable();
    expect(pageOrder(element)).toEqual(['4', '3', '2', '1']);

    clickButton(element, 'Reset');
    await fixture.whenStable();
    expect(pageOrder(element)).toEqual(['1', '2', '3', '4']);
  });

  it('won’t save with every page deleted', async () => {
    const { fixture, element } = await setup();
    for (const page of [1, 2, 3, 4]) {
      clickButton(element, `Delete page ${page}`);
      await fixture.whenStable();
    }
    expect(clickButton(element, 'Save changes', { dryRun: true }).disabled).toBe(true);
    expect(element.textContent).toContain('Keep at least one page.');
  });
});

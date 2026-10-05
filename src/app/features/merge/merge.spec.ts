import { TestBed } from '@angular/core/testing';
import { PdfToolError } from '../../core/pdf/pdf-errors';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { Merge } from './merge';

function pdf(name: string): File {
  return new File(['%PDF-1.7'], name, { type: 'application/pdf' });
}

function drop(target: Element, files: File[]): void {
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files, types: ['Files'] } });
  target.dispatchEvent(event);
}

describe('Merge', () => {
  const merge = vi.fn<PdfService['merge']>();

  beforeEach(() => {
    merge.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { merge } },
        {
          provide: PdfRenderService,
          useValue: {
            getPageCount: () => Promise.resolve(2),
            renderThumbnail: () => new Promise(() => {}),
            release: vi.fn(),
          },
        },
      ],
    });
  });

  async function setup(...names: string[]) {
    const fixture = TestBed.createComponent(Merge);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    drop(element.querySelector('app-file-dropzone > div')!, names.map(pdf));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('li').length).toBe(names.length);
    });
    return { fixture, element };
  }

  const fileNames = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('li p.truncate'), (p) => p.textContent?.trim());

  const button = (element: HTMLElement, label: string) =>
    Array.from(element.querySelectorAll('button')).find((b) =>
      (b.getAttribute('aria-label') ?? b.textContent ?? '').includes(label),
    )!;

  it('needs at least two files before merging', async () => {
    const { element } = await setup('a.pdf');
    expect(button(element, 'Merge PDF').disabled).toBe(true);
    expect(element.textContent).toContain('Add at least two PDFs');
  });

  it('reorders files with the move buttons and merges in that order', async () => {
    const { fixture, element } = await setup('a.pdf', 'b.pdf', 'c.pdf');
    merge.mockImplementation(async (_files, onProgress) => {
      onProgress?.(1);
      return new Blob(['merged'], { type: 'application/pdf' });
    });

    button(element, 'Move c.pdf up').click();
    await fixture.whenStable();
    expect(fileNames(element)).toEqual(['a.pdf', 'c.pdf', 'b.pdf']);

    button(element, 'Merge PDF').click();
    await fixture.whenStable();

    expect(merge.mock.calls[0][0].map((f) => f.name)).toEqual(['a.pdf', 'c.pdf', 'b.pdf']);
    expect(element.textContent).toContain('Your file is ready');
    expect(element.textContent).toContain('merged.pdf');
  });

  it('shows a clear error when merging fails', async () => {
    const { fixture, element } = await setup('a.pdf', 'locked.pdf');
    merge.mockRejectedValue(new PdfToolError('encrypted', '“locked.pdf” is password-protected.'));

    button(element, 'Merge PDF').click();
    await fixture.whenStable();

    expect(element.querySelector('[role=alert]')?.textContent).toContain(
      '“locked.pdf” is password-protected.',
    );
  });

  it('removes files and releases their previews', async () => {
    const { fixture, element } = await setup('a.pdf', 'b.pdf');
    const renderer = TestBed.inject(PdfRenderService);

    button(element, 'Remove a.pdf').click();
    await fixture.whenStable();

    expect(fileNames(element)).toEqual(['b.pdf']);
    expect(renderer.release).toHaveBeenCalledTimes(1);
  });
});

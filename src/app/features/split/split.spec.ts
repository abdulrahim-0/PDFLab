import { TestBed } from '@angular/core/testing';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { Split } from './split';

function drop(target: Element, files: File[]): void {
  const event = new Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: { files, types: ['Files'] } });
  target.dispatchEvent(event);
}

describe('Split', () => {
  const split = vi.fn<PdfService['split']>();
  let pageCount: Promise<number>;

  beforeEach(() => {
    split.mockReset();
    split.mockResolvedValue({ filename: 'report-split.zip', blob: new Blob(['zip']) });
    pageCount = Promise.resolve(6);
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { split } },
        {
          provide: PdfRenderService,
          useValue: {
            getPageCount: () => pageCount,
            renderThumbnail: () => new Promise(() => {}),
            release: vi.fn(),
          },
        },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(Split);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    drop(element.querySelector('app-file-dropzone > div')!, [
      new File(['%PDF-1.7'], 'report.pdf', { type: 'application/pdf' }),
    ]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('app-page-grid li').length).toBe(6);
    });
    return { fixture, element };
  }

  const splitButton = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Split PDF'),
    )!;

  async function typeRanges(
    fixture: { whenStable(): Promise<unknown> },
    element: HTMLElement,
    value: string,
  ) {
    const input = element.querySelector<HTMLInputElement>('#split-ranges')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('shows every page and starts with page 1 selected', async () => {
    const { element } = await setup();
    expect(element.querySelector<HTMLInputElement>('#split-ranges')!.value).toBe('1');
    expect(element.textContent).toContain('You’ll get 1 PDF.');
  });

  it('highlights the pages in each range and splits with them', async () => {
    const { fixture, element } = await setup();

    await typeRanges(fixture, element, '1-2, 5-');

    const badges = Array.from(
      element.querySelectorAll('app-page-grid li'),
      (li) => li.querySelector('span.rounded-full')?.textContent?.trim() ?? null,
    );
    expect(badges).toEqual(['1', '1', null, null, '2', '2']);
    expect(element.textContent).toContain('You’ll get 2 PDFs in a zip file.');

    splitButton(element).click();
    await fixture.whenStable();

    expect(split.mock.calls[0][1]).toEqual([
      { start: 1, end: 2 },
      { start: 5, end: 6 },
    ]);
    expect(element.textContent).toContain('report-split.zip');
  });

  it('explains invalid ranges and blocks splitting', async () => {
    const { fixture, element } = await setup();

    await typeRanges(fixture, element, '4-9');

    const input = element.querySelector('#split-ranges')!;
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('#split-ranges-help')!.textContent).toContain(
      'goes past the last page',
    );
    expect(splitButton(element).disabled).toBe(true);
  });

  it('can extract every page', async () => {
    const { fixture, element } = await setup();

    element.querySelector<HTMLInputElement>('input[value="every-page"]')!.click();
    await fixture.whenStable();

    expect(element.querySelector('#split-ranges')).toBeNull();
    expect(element.textContent).toContain('You’ll get 6 PDFs in a zip file.');
    splitButton(element).click();
    await fixture.whenStable();
    expect(split.mock.calls[0][1]).toHaveLength(6);
  });

  it('blocks splitting when the PDF can’t be read', async () => {
    pageCount = Promise.reject(new Error('locked'));
    pageCount.catch(() => undefined);
    const fixture = TestBed.createComponent(Split);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    drop(element.querySelector('app-file-dropzone > div')!, [
      new File(['%PDF-1.7'], 'locked.pdf', { type: 'application/pdf' }),
    ]);

    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.textContent).toContain('This PDF can’t be split.');
    });
    expect(splitButton(element).disabled).toBe(true);
  });
});

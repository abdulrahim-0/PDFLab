import { TestBed } from '@angular/core/testing';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { clickButton, dropFiles, fakeRenderer, pdfFile } from '../../shared/testing';
import { PageNumbers } from './page-numbers';

describe('PageNumbers', () => {
  const pageNumbers = vi.fn<PdfService['pageNumbers']>();

  beforeEach(() => {
    pageNumbers.mockReset();
    pageNumbers.mockResolvedValue({ filename: 'a-numbered.pdf', blob: new Blob(['x']) });
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { pageNumbers } },
        {
          provide: PdfRenderService,
          useValue: {
            ...fakeRenderer(9),
            getPageSize: () => Promise.resolve({ width: 600, height: 800 }),
          },
        },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(PageNumbers);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, [pdfFile('a.pdf')]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('app-stamp-preview .stamp-mark')).not.toBeNull();
    });
    return { fixture, element };
  }

  async function type(
    fixture: { whenStable(): Promise<unknown> },
    input: HTMLInputElement,
    value: string,
  ) {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  it('previews and adds plain numbers at the bottom center by default', async () => {
    const { fixture, element } = await setup();
    expect(element.querySelector('.stamp-mark')!.textContent?.trim()).toBe('1');

    clickButton(element, 'Add page numbers');
    await fixture.whenStable();
    expect(pageNumbers.mock.calls[0][1]).toEqual({
      position: { v: 'bottom', h: 'center' },
      format: 'n',
      startNumber: 1,
      firstPage: 1,
      fontSize: 11,
      margin: 36,
      color: '#000000',
    });
  });

  it('skips a cover page and previews the first numbered page', async () => {
    const { fixture, element } = await setup();
    element
      .querySelector<HTMLInputElement>('input[name=number-format][value=page-n-of-total]')!
      .click();
    await type(fixture, element.querySelector('#first-page')!, '2');

    expect(element.querySelector('.stamp-mark')!.textContent?.trim()).toBe('Page 1 of 8');
    expect(element.querySelector('figcaption')!.textContent).toContain('page 2');

    element.querySelector<HTMLInputElement>('input[aria-label="Top right"]')!.click();
    await fixture.whenStable();
    clickButton(element, 'Add page numbers');
    await fixture.whenStable();
    expect(pageNumbers.mock.calls[0][1]).toMatchObject({
      firstPage: 2,
      format: 'page-n-of-total',
      position: { v: 'top', h: 'right' },
    });
  });

  it('only offers top and bottom positions', async () => {
    const { element } = await setup();
    const labels = Array.from(element.querySelectorAll('app-position-picker input'), (i) =>
      i.getAttribute('aria-label'),
    );
    expect(labels).toEqual([
      'Top left',
      'Top center',
      'Top right',
      'Bottom left',
      'Bottom center',
      'Bottom right',
    ]);
  });

  it('flags a first page past the end', async () => {
    const { fixture, element } = await setup();
    await type(fixture, element.querySelector('#first-page')!, '12');
    expect(element.querySelector('#first-page-error')!.textContent).toContain('1 to 9');
    expect(clickButton(element, 'Add page numbers', { dryRun: true }).disabled).toBe(true);
  });
});

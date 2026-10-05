import { TestBed } from '@angular/core/testing';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { clickButton, dropFiles, fakeRenderer, pdfFile } from '../../shared/testing';
import { Watermark } from './watermark';

describe('Watermark', () => {
  const watermark = vi.fn<PdfService['watermark']>();

  beforeEach(() => {
    watermark.mockReset();
    watermark.mockResolvedValue({ filename: 'memo-watermarked.pdf', blob: new Blob(['x']) });
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { watermark } },
        {
          provide: PdfRenderService,
          useValue: {
            ...fakeRenderer(2),
            getPageSize: () => Promise.resolve({ width: 600, height: 800 }),
          },
        },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(Watermark);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, [pdfFile('memo.pdf')]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('app-stamp-preview figure')).not.toBeNull();
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

  it('previews the default text watermark in the center', async () => {
    const { element } = await setup();
    const mark = element.querySelector<HTMLElement>('app-stamp-preview .stamp-mark')!;
    expect(mark.textContent?.trim()).toBe('CONFIDENTIAL');
    // 600pt page shown 280px wide: the center is at 140px.
    expect(mark.style.left).toBe('140px');
  });

  it('sends a text watermark with the chosen layout', async () => {
    const { fixture, element } = await setup();
    await type(fixture, element.querySelector('#watermark-text')!, 'DRAFT');
    element.querySelector<HTMLInputElement>('input[name=watermark-angle][value="0"]')!.click();
    element.querySelector<HTMLInputElement>('input[aria-label="Bottom right"]')!.click();
    await fixture.whenStable();

    clickButton(element, 'Add watermark');
    await fixture.whenStable();

    expect(watermark.mock.calls[0][1]).toEqual({
      kind: 'text',
      text: 'DRAFT',
      fontSize: 60,
      color: '#d32f2f',
      opacity: 0.3,
      angle: 0,
      position: { v: 'bottom', h: 'right' },
      tile: false,
    });
  });

  it('tiles the preview and disables the position picker', async () => {
    const { fixture, element } = await setup();
    element.querySelector<HTMLInputElement>('input[type=checkbox]')!.click();
    await fixture.whenStable();

    expect(element.querySelectorAll('app-stamp-preview .stamp-mark').length).toBeGreaterThan(1);
    expect(element.querySelector('app-position-picker fieldset')!.hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('needs text or an image before it can run', async () => {
    const { fixture, element } = await setup();
    await type(fixture, element.querySelector('#watermark-text')!, '   ');
    expect(clickButton(element, 'Add watermark', { dryRun: true }).disabled).toBe(true);

    element.querySelector<HTMLInputElement>('input[name=watermark-kind][value=image]')!.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('Choose an image for the watermark.');
  });

  it('explains when text will be added as an image', async () => {
    const { fixture, element } = await setup();
    await type(fixture, element.querySelector('#watermark-text')!, 'سري');
    expect(element.textContent).toContain('added as a sharp image');
  });
});

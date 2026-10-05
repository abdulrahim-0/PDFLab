import { TestBed } from '@angular/core/testing';
import { PdfToolError } from '../../core/pdf/pdf-errors';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { clickButton, dropFiles, fakeRenderer, pdfFile } from '../../shared/testing';
import { Unlock } from './unlock';

describe('Unlock', () => {
  const unlock = vi.fn<PdfService['unlock']>();
  let pageCount: () => Promise<number>;

  beforeEach(() => {
    unlock.mockReset();
    unlock.mockResolvedValue({ filename: 'a-unlocked.pdf', blob: new Blob(['x']) });
    pageCount = () => Promise.reject(new PdfToolError('encrypted', 'locked'));
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { unlock } },
        { provide: PdfRenderService, useValue: fakeRenderer(() => pageCount()) },
      ],
    });
  });

  async function setup(waitFor: string) {
    const fixture = TestBed.createComponent(Unlock);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, [pdfFile('a.pdf')]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.textContent).toContain(waitFor);
    });
    return { fixture, element };
  }

  it('asks for the password of a locked file', async () => {
    const { fixture, element } = await setup('needs its password to open');
    expect(clickButton(element, 'Unlock PDF', { dryRun: true }).disabled).toBe(true);

    const input = element.querySelector<HTMLInputElement>('app-password-field input')!;
    input.value = 's3cret';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    clickButton(element, 'Unlock PDF');
    await fixture.whenStable();

    expect(unlock.mock.calls[0][1]).toBe('s3cret');
    expect(element.textContent).toContain('a-unlocked.pdf');
  });

  it('shows a wrong-password error', async () => {
    unlock.mockRejectedValue(
      new PdfToolError('wrong-password', 'That password doesn’t open “a.pdf”.'),
    );
    const { fixture, element } = await setup('needs its password to open');
    const input = element.querySelector<HTMLInputElement>('app-password-field input')!;
    input.value = 'nope';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    clickButton(element, 'Unlock PDF');
    await fixture.whenStable();

    expect(element.querySelector('[role=alert]')!.textContent).toContain(
      'That password doesn’t open',
    );
  });

  it('lifts restrictions on files that open without a password', async () => {
    pageCount = () => Promise.resolve(3);
    const { fixture, element } = await setup('opens without a password');
    clickButton(element, 'Unlock PDF');
    await fixture.whenStable();
    expect(unlock.mock.calls[0][1]).toBe('');
  });
});

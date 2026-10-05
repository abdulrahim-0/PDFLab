import { TestBed } from '@angular/core/testing';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfService } from '../../core/pdf/pdf.service';
import { clickButton, dropFiles, fakeRenderer, pdfFile } from '../../shared/testing';
import { Protect } from './protect';

describe('Protect', () => {
  const protect = vi.fn<PdfService['protect']>();

  beforeEach(() => {
    protect.mockReset();
    protect.mockResolvedValue({ filename: 'a-protected.pdf', blob: new Blob(['x']) });
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfService, useValue: { protect } },
        { provide: PdfRenderService, useValue: fakeRenderer(2) },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(Protect);
    const element: HTMLElement = fixture.nativeElement;
    await fixture.whenStable();
    dropFiles(element, [pdfFile('a.pdf')]);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('app-password-field').length).toBe(2);
    });
    const fields = () => element.querySelectorAll<HTMLInputElement>('app-password-field input');
    const type = async (index: number, value: string) => {
      fields()[index].value = value;
      fields()[index].dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { fixture, element, fields, type };
  }

  it('needs matching passwords', async () => {
    const { element, type } = await setup();
    await type(0, 'correct horse');
    await type(1, 'correct hors');
    expect(element.textContent).toContain('The passwords don’t match.');
    expect(clickButton(element, 'Protect PDF', { dryRun: true }).disabled).toBe(true);

    await type(1, 'correct horse');
    expect(clickButton(element, 'Protect PDF', { dryRun: true }).disabled).toBe(false);
  });

  it('encrypts with full permissions by default', async () => {
    const { fixture, element, type } = await setup();
    await type(0, 'correct horse');
    await type(1, 'correct horse');
    clickButton(element, 'Protect PDF');
    await fixture.whenStable();

    expect(protect.mock.calls[0][1]).toEqual({
      userPassword: 'correct horse',
      ownerPassword: undefined,
      permissions: { printing: true, copying: true, modifying: true },
    });
  });

  it('asks for an optional permissions password when restricting', async () => {
    const { fixture, element, type } = await setup();
    await type(0, 'pw');
    await type(1, 'pw');
    expect(element.textContent).toContain('longer passwords');

    element.querySelectorAll<HTMLInputElement>('input[type=checkbox]')[0].click();
    await fixture.whenStable();
    await type(2, 'pw');
    expect(element.textContent).toContain('Use a different password');

    await type(2, 'boss');
    clickButton(element, 'Protect PDF');
    await fixture.whenStable();
    expect(protect.mock.calls[0][1]).toEqual({
      userPassword: 'pw',
      ownerPassword: 'boss',
      permissions: { printing: false, copying: true, modifying: true },
    });
  });

  it('can show the password', async () => {
    const { fixture, element, fields } = await setup();
    clickButton(element, 'Show password');
    await fixture.whenStable();
    expect(fields()[0].type).toBe('text');
  });
});

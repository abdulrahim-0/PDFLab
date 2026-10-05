import { TestBed } from '@angular/core/testing';
import { PdfExportService } from './pdf-export.service';
import { PdfRenderService, safeScale } from './pdf-render.service';
import { PdfService } from './pdf.service';

describe('PdfExportService', () => {
  const renderPageImage = vi.fn<PdfRenderService['renderPageImage']>();
  const zip = vi.fn<PdfService['zip']>();

  beforeEach(() => {
    renderPageImage.mockReset().mockImplementation(async (_f, page) => new Blob([`p${page}`]));
    zip
      .mockReset()
      .mockImplementation(async (_files, filename) => ({ filename, blob: new Blob() }));
    TestBed.configureTestingModule({
      providers: [
        { provide: PdfRenderService, useValue: { renderPageImage } },
        { provide: PdfService, useValue: { zip } },
      ],
    });
  });

  const file = new File(['%PDF'], 'Annual Report.pdf');

  it('returns a single image directly', async () => {
    const service = TestBed.inject(PdfExportService);
    const result = await service.pagesToImages(file, [3], { format: 'png', dpi: 150 });

    expect(result.filename).toBe('Annual Report-page-3.png');
    expect(renderPageImage).toHaveBeenCalledWith(file, 3, { dpi: 150, format: 'png' });
    expect(zip).not.toHaveBeenCalled();
  });

  it('zips several pages and reports progress', async () => {
    const service = TestBed.inject(PdfExportService);
    const progress: number[] = [];
    const result = await service.pagesToImages(file, [1, 2], { format: 'jpeg', dpi: 72 }, (p) =>
      progress.push(p),
    );

    expect(result.filename).toBe('Annual Report-images.zip');
    expect(zip.mock.calls[0][0].map((f) => f.filename)).toEqual([
      'Annual Report-page-1.jpg',
      'Annual Report-page-2.jpg',
    ]);
    expect(progress).toEqual([0.45, 0.9]);
  });
});

describe('safeScale', () => {
  it('keeps the requested scale for normal pages', () => {
    expect(safeScale(612, 792, 300 / 72)).toBeCloseTo(300 / 72);
  });

  it('shrinks huge pages to fit canvas limits', () => {
    const scale = safeScale(2000, 3000, 300 / 72);
    expect(2000 * scale * 3000 * scale).toBeLessThanOrEqual(16_777_216 + 1);
    expect(safeScale(20000, 100, 1)).toBeCloseTo(16384 / 20000);
  });
});

import { formatBytes, hasPdfHeader, validateFiles } from './file-validation';

const pdf = (name = 'doc.pdf', content = '%PDF-1.7\n...') =>
  new File([content], name, { type: 'application/pdf' });

describe('validateFiles', () => {
  const rules = { kind: 'pdf' as const, maxFileBytes: 1024 };

  it('accepts valid PDFs', async () => {
    const file = pdf();
    expect(await validateFiles([file], rules)).toEqual({ accepted: [file], rejected: [] });
  });

  it('accepts a .pdf with no MIME type', async () => {
    const file = new File(['%PDF-1.4'], 'scan.PDF');
    expect((await validateFiles([file], rules)).accepted).toEqual([file]);
  });

  it('rejects files that are not PDFs', async () => {
    const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
    expect((await validateFiles([file], rules)).rejected).toEqual([
      { file, reason: 'Not a PDF file.' },
    ]);
  });

  it('rejects a .pdf without a PDF header', async () => {
    const result = await validateFiles([pdf('fake.pdf', 'GIF89a')], rules);
    expect(result.rejected[0].reason).toContain('missing PDF header');
  });

  it('rejects empty and oversized files', async () => {
    const result = await validateFiles(
      [pdf('empty.pdf', ''), pdf('big.pdf', '%PDF-' + 'x'.repeat(2000))],
      rules,
    );
    expect(result.rejected.map((r) => r.reason)).toEqual([
      'The file is empty.',
      'Larger than the 1 KB limit.',
    ]);
  });

  it('enforces the file count limit, including existing files', async () => {
    const files = [pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')];
    const result = await validateFiles(files, { ...rules, maxFiles: 3, existingCount: 1 });
    expect(result.accepted).toEqual(files.slice(0, 2));
    expect(result.rejected).toEqual([{ file: files[2], reason: 'You can add up to 3 files.' }]);
  });
});

describe('hasPdfHeader', () => {
  it('finds a header after leading junk', async () => {
    expect(await hasPdfHeader(new Blob(['﻿junk%PDF-1.7']))).toBe(true);
  });
});

describe('formatBytes', () => {
  it.each([
    [500, '500 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [100 * 1024 * 1024, '100 MB'],
    [12.34 * 1024 * 1024, '12 MB'],
  ])('formats %d as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

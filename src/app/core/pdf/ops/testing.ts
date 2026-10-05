import { PDFDocument } from '@cantoo/pdf-lib';

/** Test helper: a PDF whose pages have the given widths, so page order can be checked. */
export async function makePdf(...widths: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const width of widths) {
    doc.addPage([width, 800]);
  }
  return doc.save();
}

export async function pageWidths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getWidth());
}

export async function makeEncryptedPdf(userPassword = 'secret'): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([300, 400]);
  doc.encrypt({ userPassword, ownerPassword: `${userPassword}-owner` });
  return doc.save();
}

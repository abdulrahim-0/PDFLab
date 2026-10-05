import { PDFDocument, PDFInvalidObject, PDFName, PDFRawStream } from '@cantoo/pdf-lib';
import { baseName, OutputBytes } from '../../files/output-file';
import { corruptError, encryptedError, PdfToolError } from '../pdf-errors';

/**
 * Pure pdf-lib operations live in this folder. They run inside the PDF worker
 * but don't depend on it, so they can be unit tested directly.
 */

export interface NamedPdf {
  name: string;
  data: ArrayBuffer | Uint8Array;
}

export type ProgressFn = (fraction: number) => void;

/**
 * Loads a PDF, turning parse failures into user-facing errors. Encrypted files
 * are rejected unless the right `password` is given, in which case they come
 * back decrypted.
 */
export async function loadPdf(file: NamedPdf, password?: string): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc =
      password === undefined
        ? await PDFDocument.load(file.data, { ignoreEncryption: true, updateMetadata: false })
        : await PDFDocument.load(file.data, { password, updateMetadata: false });
  } catch (error) {
    if (password !== undefined && /password/i.test(String((error as Error)?.message))) {
      throw new PdfToolError('wrong-password', `That password doesn’t open “${file.name}”.`);
    }
    throw corruptError(file.name);
  }
  if (doc.isEncrypted) {
    throw encryptedError(file.name);
  }
  if (doc.getPageCount() === 0) {
    throw corruptError(file.name);
  }
  return doc;
}

export async function createPdf(): Promise<PDFDocument> {
  const doc = await PDFDocument.create();
  doc.setProducer('PDFLab');
  doc.setCreator('PDFLab');
  return doc;
}

/**
 * pdf-lib keeps a loaded file's cross-reference streams and object-stream
 * containers and writes them back out. They're dead weight (a fresh table
 * and fresh object streams are written on save), and after decryption the
 * old cross-reference stream survives as an unparsed object that still
 * carries /Encrypt. Drop them all.
 */
export function dropStaleXrefStreams(doc: PDFDocument): void {
  const stale = [PDFName.of('XRef'), PDFName.of('ObjStm')];
  for (const [ref, object] of doc.context.enumerateIndirectObjects()) {
    const isStaleStream =
      object instanceof PDFRawStream &&
      stale.includes(object.dict.get(PDFName.of('Type')) as PDFName);
    const isStaleXref =
      object instanceof PDFInvalidObject && /\/Type\s*\/XRef\b/.test(rawText(object));
    if (isStaleStream || isStaleXref) {
      doc.context.delete(ref);
    }
  }
}

function rawText(object: PDFInvalidObject): string {
  const bytes = new Uint8Array(object.sizeInBytes());
  object.copyBytesInto(bytes, 0);
  return new TextDecoder('latin1').decode(bytes);
}

/** Saves a document as `<source name>-<suffix>.pdf`. */
export async function savePdf(
  doc: PDFDocument,
  sourceName: string,
  suffix: string,
): Promise<OutputBytes> {
  doc.setProducer('PDFLab');
  dropStaleXrefStreams(doc);
  return {
    filename: `${baseName(sourceName)}-${suffix}.pdf`,
    mimeType: 'application/pdf',
    data: await doc.save(),
  };
}

export function assertPageIndex(doc: PDFDocument, index: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= doc.getPageCount()) {
    throw new PdfToolError('invalid-input', `Page ${index + 1} isn’t in this PDF.`);
  }
}

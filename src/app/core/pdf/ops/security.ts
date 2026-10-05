import { PDFDocument, PDFRef } from '@cantoo/pdf-lib';
import { OutputBytes } from '../../files/output-file';
import { PdfToolError } from '../pdf-errors';
import { loadPdf, NamedPdf, ProgressFn, savePdf } from './load';

export interface PdfPermissions {
  printing: boolean;
  copying: boolean;
  modifying: boolean;
}

export interface ProtectOptions {
  /** Needed to open the file. */
  userPassword: string;
  /** Needed to change permissions. Generated when restrictions are set without one. */
  ownerPassword?: string;
  permissions: PdfPermissions;
}

/** Encrypts with AES-256, the strongest option in the PDF standard. */
export async function protectPdf(
  file: NamedPdf,
  { userPassword, ownerPassword, permissions }: ProtectOptions,
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  if (!userPassword) {
    throw new PdfToolError('invalid-input', 'Enter a password.');
  }
  const doc = await loadPdf(file);
  const restricted = !permissions.printing || !permissions.copying || !permissions.modifying;
  doc.encrypt({
    algorithm: 'AES-256',
    userPassword,
    // With no restrictions, the open password also unlocks everything.
    ownerPassword: ownerPassword || (restricted ? randomPassword() : userPassword),
    permissions: {
      printing: permissions.printing ? 'highResolution' : false,
      copying: permissions.copying,
      modifying: permissions.modifying,
      annotating: permissions.modifying,
      documentAssembly: permissions.modifying,
      fillingForms: true,
      contentAccessibility: true,
    },
  });
  onProgress?.(0.5);
  const output = await savePdf(doc, file.name, 'protected');
  onProgress?.(1);
  return output;
}

/**
 * Removes encryption. `password` is the open password; leave it empty for
 * files that open without one but restrict printing, copying or editing.
 */
export async function unlockPdf(
  file: NamedPdf,
  password: string,
  onProgress?: ProgressFn,
): Promise<OutputBytes> {
  const data = file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
  let probe: PDFDocument;
  try {
    probe = await PDFDocument.load(data.slice(), { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new PdfToolError('corrupt', `“${file.name}” couldn’t be read. It may be damaged.`);
  }
  if (!probe.isEncrypted) {
    throw new PdfToolError('invalid-input', `“${file.name}” isn’t password-protected.`);
  }

  let doc: PDFDocument;
  try {
    doc = await loadPdf({ name: file.name, data }, password);
  } catch (error) {
    if (error instanceof PdfToolError && error.code === 'wrong-password' && !password) {
      throw new PdfToolError('wrong-password', `“${file.name}” needs its password to open.`);
    }
    throw error;
  }
  // The old encryption dictionary is no longer referenced; don't carry it over.
  const encryptRef = probe.context.trailerInfo.Encrypt;
  if (encryptRef instanceof PDFRef) {
    doc.context.delete(encryptRef);
  }
  onProgress?.(0.5);
  const output = await savePdf(doc, file.name, 'unlocked');
  onProgress?.(1);
  return output;
}

function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

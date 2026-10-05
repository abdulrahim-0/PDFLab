/** A finished file produced by a tool, ready to download. */
export interface OutputFile {
  filename: string;
  blob: Blob;
}

/** Output bytes as they cross the worker boundary. */
export interface OutputBytes {
  filename: string;
  mimeType: string;
  data: Uint8Array;
}

export function toOutputFile({ filename, mimeType, data }: OutputBytes): OutputFile {
  return { filename, blob: new Blob([data as Uint8Array<ArrayBuffer>], { type: mimeType }) };
}

/** `Report Q3.pdf` → `Report Q3`. */
export function baseName(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, '') || 'document';
}

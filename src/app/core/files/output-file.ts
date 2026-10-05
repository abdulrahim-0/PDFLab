/** A finished file produced by a tool, ready to download. */
export interface OutputFile {
  filename: string;
  blob: Blob;
  /** Extra detail for the result screen, e.g. how much a file shrank. */
  note?: string;
}

/** Output bytes as they cross the worker boundary. */
export interface OutputBytes {
  filename: string;
  mimeType: string;
  data: Uint8Array;
  note?: string;
}

export function toOutputFile({ filename, mimeType, data, note }: OutputBytes): OutputFile {
  const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: mimeType });
  return note === undefined ? { filename, blob } : { filename, blob, note };
}

/** `Report Q3.pdf` → `Report Q3`. */
export function baseName(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, '') || 'document';
}

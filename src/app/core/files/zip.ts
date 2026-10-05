import JSZip from 'jszip';
import { OutputBytes } from './output-file';

/** Bundles several outputs into one zip. PDFs are already compressed, so files are stored as-is. */
export async function zipOutputs(
  files: readonly OutputBytes[],
  filename: string,
  onProgress?: (fraction: number) => void,
): Promise<OutputBytes> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const file of files) {
    zip.file(uniqueName(file.filename, used), file.data, { binary: true });
  }
  const data = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }, (meta) =>
    onProgress?.(meta.percent / 100),
  );
  return { filename, mimeType: 'application/zip', data };
}

function uniqueName(name: string, used: Set<string>): string {
  let candidate = name;
  for (let n = 2; used.has(candidate); n++) {
    candidate = name.replace(/(\.[^.]+)?$/, ` (${n})$1`);
  }
  used.add(candidate);
  return candidate;
}

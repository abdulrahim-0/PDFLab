export type FileKind = 'pdf';

export interface FileRules {
  kind: FileKind;
  maxFileBytes: number;
  /** Total number of files allowed, including `existingCount`. */
  maxFiles?: number;
  existingCount?: number;
}

export interface FileRejection {
  file: File;
  reason: string;
}

export interface ValidationResult {
  accepted: File[];
  rejected: FileRejection[];
}

export const DEFAULT_MAX_FILE_BYTES = 100 * 1024 * 1024;

export const ACCEPT_ATTRIBUTE: Record<FileKind, string> = {
  pdf: '.pdf,application/pdf',
};

export async function validateFiles(
  files: readonly File[],
  rules: FileRules,
): Promise<ValidationResult> {
  const result: ValidationResult = { accepted: [], rejected: [] };
  let count = rules.existingCount ?? 0;

  for (const file of files) {
    const reason = await rejectionReason(file, rules, count);
    if (reason) {
      result.rejected.push({ file, reason });
    } else {
      result.accepted.push(file);
      count++;
    }
  }
  return result;
}

async function rejectionReason(
  file: File,
  rules: FileRules,
  count: number,
): Promise<string | null> {
  if (rules.maxFiles !== undefined && count >= rules.maxFiles) {
    return `You can add up to ${rules.maxFiles} files.`;
  }
  if (!looksLikePdf(file)) {
    return 'Not a PDF file.';
  }
  if (file.size === 0) {
    return 'The file is empty.';
  }
  if (file.size > rules.maxFileBytes) {
    return `Larger than the ${formatBytes(rules.maxFileBytes)} limit.`;
  }
  if (!(await hasPdfHeader(file))) {
    return 'Not a valid PDF (missing PDF header).';
  }
  return null;
}

function looksLikePdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/** The spec allows junk before the header, and readers accept it within the first 1 KB. */
export async function hasPdfHeader(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  return new TextDecoder('latin1').decode(head).includes('%PDF-');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 10 || Number.isInteger(value) ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

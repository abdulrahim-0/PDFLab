export type FileKind = 'pdf' | 'image';

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
  image: '.jpg,.jpeg,.png,image/jpeg,image/png',
};

const KIND_CHECKS: Record<
  FileKind,
  {
    looksRight: (file: File) => boolean;
    wrongType: string;
    badContent: string;
    hasValidHeader: (file: Blob) => Promise<boolean>;
  }
> = {
  pdf: {
    looksRight: (file) =>
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    wrongType: 'Not a PDF file.',
    badContent: 'Not a valid PDF (missing PDF header).',
    hasValidHeader: hasPdfHeader,
  },
  image: {
    looksRight: (file) =>
      ['image/jpeg', 'image/png'].includes(file.type) || /\.(jpe?g|png)$/i.test(file.name),
    wrongType: 'Not a JPG or PNG image.',
    badContent: 'Not a valid JPG or PNG image.',
    hasValidHeader: async (file) =>
      detectImageType(new Uint8Array(await file.slice(0, 8).arrayBuffer())) !== null,
  },
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
  const checks = KIND_CHECKS[rules.kind];
  if (!checks.looksRight(file)) {
    return checks.wrongType;
  }
  if (file.size === 0) {
    return 'The file is empty.';
  }
  if (file.size > rules.maxFileBytes) {
    return `Larger than the ${formatBytes(rules.maxFileBytes)} limit.`;
  }
  if (!(await checks.hasValidHeader(file))) {
    return checks.badContent;
  }
  return null;
}

/** The spec allows junk before the header, and readers accept it within the first 1 KB. */
export async function hasPdfHeader(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  return new TextDecoder('latin1').decode(head).includes('%PDF-');
}

/** Identifies JPEG and PNG data by their magic bytes. */
export function detectImageType(head: Uint8Array): 'jpeg' | 'png' | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return 'jpeg';
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return png.every((byte, i) => head[i] === byte) ? 'png' : null;
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

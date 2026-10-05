export type PdfErrorCode = 'encrypted' | 'corrupt' | 'invalid-input' | 'unknown';

/** An error whose message is safe to show to the user as-is. */
export class PdfToolError extends Error {
  constructor(
    readonly code: PdfErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PdfToolError';
  }
}

export function encryptedError(fileName: string): PdfToolError {
  return new PdfToolError(
    'encrypted',
    `“${fileName}” is password-protected. Remove the password first, then try again.`,
  );
}

export function corruptError(fileName: string): PdfToolError {
  return new PdfToolError(
    'corrupt',
    `“${fileName}” couldn’t be read. It may be damaged or not a real PDF.`,
  );
}

export function userMessage(error: unknown): string {
  return error instanceof PdfToolError
    ? error.message
    : 'Something went wrong while processing your files. Please try again.';
}

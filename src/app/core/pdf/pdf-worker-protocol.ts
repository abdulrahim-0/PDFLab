import { PdfErrorCode } from './pdf-errors';
import { NamedPdf } from './pdf-ops';

export type PdfTask = { type: 'merge'; files: NamedPdf[] };

export interface PdfWorkerRequest {
  id: number;
  task: PdfTask;
}

export type PdfWorkerResponse =
  | { id: number; kind: 'progress'; value: number }
  | { id: number; kind: 'result'; data: Uint8Array }
  | { id: number; kind: 'error'; code: PdfErrorCode; message: string };

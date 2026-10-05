import { OutputBytes } from '../files/output-file';
import { PageRange } from './page-ranges';
import { PdfErrorCode } from './pdf-errors';
import { NamedPdf } from './pdf-ops';

export type PdfTask =
  { type: 'merge'; files: NamedPdf[] } | { type: 'split'; file: NamedPdf; ranges: PageRange[] };

export interface PdfWorkerRequest {
  id: number;
  task: PdfTask;
}

export type PdfWorkerResponse =
  | { id: number; kind: 'progress'; value: number }
  | { id: number; kind: 'result'; output: OutputBytes }
  | { id: number; kind: 'error'; code: PdfErrorCode; message: string };

import { OutputBytes } from '../files/output-file';
import { CompressionLevel } from './ops/compress';
import { ImagesToPdfOptions, NamedImage } from './ops/images-to-pdf';
import { NamedPdf } from './ops/load';
import { PageNumberOptions } from './ops/page-numbers';
import { Watermark } from './ops/watermark';
import { PageRange } from './page-ranges';
import { PdfErrorCode } from './pdf-errors';

export type PdfTask =
  | { type: 'merge'; files: NamedPdf[] }
  | { type: 'split'; file: NamedPdf; ranges: PageRange[] }
  | { type: 'rotate'; file: NamedPdf; rotations: Record<number, number> }
  | { type: 'organize'; file: NamedPdf; order: number[] }
  | { type: 'images-to-pdf'; images: NamedImage[]; options: ImagesToPdfOptions }
  | { type: 'zip'; files: OutputBytes[]; filename: string }
  | { type: 'watermark'; file: NamedPdf; watermark: Watermark }
  | { type: 'page-numbers'; file: NamedPdf; options: PageNumberOptions }
  | { type: 'compress'; file: NamedPdf; level: CompressionLevel };

export interface PdfWorkerRequest {
  id: number;
  task: PdfTask;
}

export type PdfWorkerResponse =
  | { id: number; kind: 'progress'; value: number }
  | { id: number; kind: 'result'; output: OutputBytes }
  | { id: number; kind: 'error'; code: PdfErrorCode; message: string };

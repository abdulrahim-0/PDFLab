/// <reference lib="webworker" />

import { baseName, OutputBytes } from '../files/output-file';
import { zipOutputs } from '../files/zip';
import { imagesToPdf } from './ops/images-to-pdf';
import { ProgressFn } from './ops/load';
import { mergePdfs } from './ops/merge';
import { organizePdf } from './ops/organize';
import { rotatePdf } from './ops/rotate';
import { splitPdf } from './ops/split';
import { PdfToolError } from './pdf-errors';
import { PdfTask, PdfWorkerRequest, PdfWorkerResponse } from './pdf-worker-protocol';

function post(message: PdfWorkerResponse, transfer: Transferable[] = []): void {
  postMessage(message, transfer);
}

/** Returns one output as-is, or several as a zip (zipping takes the last 10% of progress). */
async function single(
  build: (onProgress: ProgressFn) => Promise<OutputBytes[]>,
  zipName: string,
  onProgress: ProgressFn,
): Promise<OutputBytes> {
  const outputs = await build((p) => onProgress(p * 0.9));
  if (outputs.length === 1) {
    onProgress(1);
    return outputs[0];
  }
  return zipOutputs(outputs, zipName, (p) => onProgress(0.9 + p * 0.1));
}

async function runTask(task: PdfTask, onProgress: ProgressFn): Promise<OutputBytes> {
  switch (task.type) {
    case 'merge':
      return {
        filename: 'merged.pdf',
        mimeType: 'application/pdf',
        data: await mergePdfs(task.files, onProgress),
      };
    case 'split':
      return single(
        (p) => splitPdf(task.file, task.ranges, p),
        `${baseName(task.file.name)}-split.zip`,
        onProgress,
      );
    case 'rotate':
      return rotatePdf(task.file, task.rotations, onProgress);
    case 'organize':
      return organizePdf(task.file, task.order, onProgress);
    case 'images-to-pdf':
      return imagesToPdf(task.images, task.options, onProgress);
    case 'zip':
      return zipOutputs(task.files, task.filename, onProgress);
  }
}

addEventListener('message', async ({ data }: MessageEvent<PdfWorkerRequest>) => {
  const { id, task } = data;
  try {
    const output = await runTask(task, (value) => post({ id, kind: 'progress', value }));
    post({ id, kind: 'result', output }, [output.data.buffer]);
  } catch (error) {
    const { code, message } =
      error instanceof PdfToolError
        ? error
        : { code: 'unknown' as const, message: String((error as Error)?.message ?? error) };
    post({ id, kind: 'error', code, message });
  }
});

/// <reference lib="webworker" />

import { baseName, OutputBytes } from '../files/output-file';
import { zipOutputs } from '../files/zip';
import { PdfToolError } from './pdf-errors';
import { mergePdfs, ProgressFn, splitPdf } from './pdf-ops';
import { PdfTask, PdfWorkerRequest, PdfWorkerResponse } from './pdf-worker-protocol';

function post(message: PdfWorkerResponse, transfer: Transferable[] = []): void {
  postMessage(message, transfer);
}

async function runTask(task: PdfTask, onProgress: ProgressFn): Promise<OutputBytes> {
  switch (task.type) {
    case 'merge':
      return {
        filename: 'merged.pdf',
        mimeType: 'application/pdf',
        data: await mergePdfs(task.files, onProgress),
      };
    case 'split': {
      // Splitting is most of the work; zipping takes the last 10%.
      const parts = await splitPdf(task.file, task.ranges, (p) => onProgress(p * 0.9));
      if (parts.length === 1) {
        onProgress(1);
        return parts[0];
      }
      return zipOutputs(parts, `${baseName(task.file.name)}-split.zip`, (p) =>
        onProgress(0.9 + p * 0.1),
      );
    }
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

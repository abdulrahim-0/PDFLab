/// <reference lib="webworker" />

import { PdfToolError } from './pdf-errors';
import { mergePdfs } from './pdf-ops';
import { PdfTask, PdfWorkerRequest, PdfWorkerResponse } from './pdf-worker-protocol';

function post(message: PdfWorkerResponse, transfer: Transferable[] = []): void {
  postMessage(message, transfer);
}

function runTask(task: PdfTask, onProgress: (value: number) => void): Promise<Uint8Array> {
  switch (task.type) {
    case 'merge':
      return mergePdfs(task.files, onProgress);
  }
}

addEventListener('message', async ({ data }: MessageEvent<PdfWorkerRequest>) => {
  const { id, task } = data;
  try {
    const result = await runTask(task, (value) => post({ id, kind: 'progress', value }));
    post({ id, kind: 'result', data: result }, [result.buffer]);
  } catch (error) {
    const { code, message } =
      error instanceof PdfToolError
        ? error
        : { code: 'unknown' as const, message: String((error as Error)?.message ?? error) };
    post({ id, kind: 'error', code, message });
  }
});

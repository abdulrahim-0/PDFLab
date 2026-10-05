import { TestBed } from '@angular/core/testing';
import { PdfToolError } from './pdf-errors';
import { PdfWorkerRequest, PdfWorkerResponse } from './pdf-worker-protocol';
import { PDF_WORKER_FACTORY, PdfService } from './pdf.service';

/** Stands in for the real worker; tests reply to requests through `respond`. */
class FakeWorker extends EventTarget {
  readonly requests: PdfWorkerRequest[] = [];
  terminated = false;

  postMessage(request: PdfWorkerRequest): void {
    this.requests.push(request);
  }

  respond(message: PdfWorkerResponse): void {
    this.dispatchEvent(new MessageEvent('message', { data: message }));
  }

  terminate(): void {
    this.terminated = true;
  }
}

function pdfFile(name: string): File {
  return new File(['%PDF-1.7 test'], name, { type: 'application/pdf' });
}

describe('PdfService', () => {
  let worker: FakeWorker;
  let service: PdfService;

  beforeEach(() => {
    worker = new FakeWorker();
    TestBed.configureTestingModule({
      providers: [{ provide: PDF_WORKER_FACTORY, useValue: () => worker }],
    });
    service = TestBed.inject(PdfService);
  });

  async function nextRequest(): Promise<PdfWorkerRequest> {
    await vi.waitFor(() => expect(worker.requests.length).toBeGreaterThan(0));
    return worker.requests.at(-1)!;
  }

  it('sends files to the worker and resolves with a PDF blob', async () => {
    const progress: number[] = [];
    const result = service.merge([pdfFile('a.pdf'), pdfFile('b.pdf')], (p) => progress.push(p));

    const { id, task } = await nextRequest();
    expect(task.type).toBe('merge');
    expect(task.files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);

    worker.respond({ id, kind: 'progress', value: 0.5 });
    worker.respond({ id, kind: 'result', data: new Uint8Array([1, 2, 3]) });

    const blob = await result;
    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBe(3);
    expect(progress).toEqual([0.5]);
  });

  it('turns worker errors into PdfToolErrors', async () => {
    const result = service.merge([pdfFile('a.pdf')]);
    const { id } = await nextRequest();

    worker.respond({ id, kind: 'error', code: 'encrypted', message: 'Locked' });

    await expect(result).rejects.toBeInstanceOf(PdfToolError);
    await expect(result).rejects.toMatchObject({ code: 'encrypted', message: 'Locked' });
  });

  it('rejects pending work and restarts the worker after a crash', async () => {
    const result = service.merge([pdfFile('a.pdf')]);
    await nextRequest();

    worker.dispatchEvent(new Event('error', { cancelable: true }));

    await expect(result).rejects.toThrow('stopped unexpectedly');
    expect(worker.terminated).toBe(true);

    const replacement = new FakeWorker();
    worker = replacement;
    service.merge([pdfFile('b.pdf')]).catch(() => undefined);
    await vi.waitFor(() => expect(replacement.requests.length).toBe(1));
  });
});

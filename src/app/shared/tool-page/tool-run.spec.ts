import { PdfToolError } from '../../core/pdf/pdf-errors';
import { ToolRun } from './tool-run';

describe('ToolRun', () => {
  const result = { blob: new Blob(['x']), filename: 'out.pdf' };

  it('moves through processing to done and tracks progress', async () => {
    const run = new ToolRun();
    let finish!: () => void;

    const done = run.run(
      (onProgress) =>
        new Promise((resolve) => {
          onProgress(0.4);
          finish = () => resolve(result);
        }),
    );

    expect(run.status()).toBe('processing');
    expect(run.progress()).toBe(0.4);

    finish();
    await done;
    expect(run.status()).toBe('done');
    expect(run.result()).toBe(result);
  });

  it('shows PdfToolError messages as-is and hides other errors', async () => {
    const run = new ToolRun();

    await run.run(() => Promise.reject(new PdfToolError('corrupt', 'Bad file')));
    expect(run.status()).toBe('error');
    expect(run.error()).toBe('Bad file');

    await run.run(() => Promise.reject(new TypeError('x is undefined')));
    expect(run.error()).toContain('Something went wrong');
  });

  it('resets back to idle', async () => {
    const run = new ToolRun();
    await run.run(async () => result);
    run.reset();
    expect(run.status()).toBe('idle');
    expect(run.result()).toBeNull();
  });
});

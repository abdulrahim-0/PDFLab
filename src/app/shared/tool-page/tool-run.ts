import { signal } from '@angular/core';
import { OutputFile } from '../../core/files/output-file';
import { userMessage } from '../../core/pdf/pdf-errors';

export type ToolStatus = 'idle' | 'processing' | 'done' | 'error';

export type ToolResult = OutputFile;

export type ToolTask = (onProgress: (fraction: number) => void) => Promise<ToolResult>;

/** State for one tool run: idle → processing → done | error. */
export class ToolRun {
  private readonly state = signal<ToolStatus>('idle');
  private readonly progressValue = signal<number | null>(null);
  private readonly resultValue = signal<ToolResult | null>(null);
  private readonly errorValue = signal<string | null>(null);

  readonly status = this.state.asReadonly();
  readonly progress = this.progressValue.asReadonly();
  readonly result = this.resultValue.asReadonly();
  readonly error = this.errorValue.asReadonly();

  async run(task: ToolTask): Promise<void> {
    if (this.state() === 'processing') {
      return;
    }
    this.reset();
    this.state.set('processing');
    try {
      const result = await task((fraction) => this.progressValue.set(fraction));
      this.resultValue.set(result);
      this.state.set('done');
    } catch (error) {
      this.errorValue.set(userMessage(error));
      this.state.set('error');
    }
  }

  reset(): void {
    this.state.set('idle');
    this.progressValue.set(null);
    this.resultValue.set(null);
    this.errorValue.set(null);
  }
}

import {
  Component,
  computed,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { downloadBlob } from '../../core/files/download';
import { formatBytes } from '../../core/files/file-validation';
import { Icon } from '../icon';
import { ProgressBar } from '../progress-bar/progress-bar';
import { ToolRun } from './tool-run';

/**
 * Shared layout for every tool: upload → workspace + options → process → download.
 *
 * Content slots:
 * - `[toolUpload]`: shown before any file is added.
 * - default: the workspace (file list, page grid…), shown once files are added.
 * - `[toolOptions]`: tool options, shown above the process button.
 */
@Component({
  selector: 'app-tool-page',
  imports: [Icon, ProgressBar],
  host: { class: 'block' },
  template: `
    <div class="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <header class="mb-8 text-center">
        <h1 class="mb-2 text-2xl font-semibold tracking-[-0.015em] sm:text-3xl">{{ title() }}</h1>
        <p class="mx-auto max-w-xl text-sm text-secondary sm:text-base">{{ description() }}</p>
      </header>

      @if (run().status() === 'done' && run().result(); as result) {
        <section
          class="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl bg-surface-container-lowest p-8 text-center shadow-sm"
          aria-labelledby="tool-done-title"
        >
          <div
            class="flex size-12 items-center justify-center rounded-full bg-surface-container-low text-success"
          >
            <app-icon class="size-6" name="check" />
          </div>
          <div>
            <h2
              #doneHeading
              id="tool-done-title"
              class="text-lg font-semibold outline-none"
              tabindex="-1"
            >
              Your file is ready
            </h2>
            <p class="text-sm break-all text-secondary">
              {{ result.filename }} · {{ resultSize() }}
            </p>
            @if (result.note) {
              <p class="mt-2 text-sm">{{ result.note }}</p>
            }
          </div>
          <button type="button" class="btn btn-primary h-12 w-full text-base" (click)="download()">
            <app-icon class="size-5" name="download" />
            Download
          </button>
          <div class="flex w-full gap-2">
            <button type="button" class="btn btn-secondary flex-1" (click)="run().reset()">
              Back to editing
            </button>
            <button type="button" class="btn btn-secondary flex-1" (click)="startOver.emit()">
              <app-icon class="size-4" name="refresh" />
              Start over
            </button>
          </div>
        </section>
      } @else if (!hasFiles()) {
        <div class="mx-auto max-w-2xl">
          <ng-content select="[toolUpload]" />
        </div>
      } @else {
        <div class="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
          <section aria-label="Files" [attr.inert]="processing() ? '' : null">
            <ng-content />
          </section>

          <aside
            class="flex flex-col gap-4 rounded-xl bg-surface-container-lowest p-5 shadow-sm lg:sticky lg:top-20"
            aria-label="Options"
          >
            <div [attr.inert]="processing() ? '' : null">
              <ng-content select="[toolOptions]" />
            </div>

            @if (run().status() === 'error') {
              <div
                class="flex items-start gap-2 rounded-lg bg-error-container p-3 text-sm text-on-error-container"
                role="alert"
              >
                <app-icon class="mt-0.5 size-4" name="alert" />
                <p>{{ run().error() }}</p>
              </div>
            }

            @if (processing()) {
              <app-progress-bar [value]="run().progress()" [label]="processingLabel()" />
            } @else {
              <button
                type="button"
                class="btn btn-primary h-12 w-full text-base"
                [disabled]="!canProcess()"
                [attr.aria-describedby]="
                  !canProcess() && processHint() ? 'tool-process-hint' : null
                "
                (click)="process.emit()"
              >
                {{ processLabel() }}
                <app-icon class="size-5" name="arrow" />
              </button>
              @if (!canProcess() && processHint()) {
                <p id="tool-process-hint" class="text-center text-xs text-secondary">
                  {{ processHint() }}
                </p>
              }
            }
          </aside>
        </div>
      }
    </div>
  `,
})
export class ToolPage {
  private readonly document = inject(DOCUMENT);

  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly run = input.required<ToolRun>();
  readonly hasFiles = input.required<boolean>();
  readonly canProcess = input(true);
  readonly processLabel = input('Process');
  readonly processingLabel = input('Processing…');
  readonly processHint = input<string>();
  readonly process = output<void>();
  readonly startOver = output<void>();

  // Move focus to the result so keyboard and screen reader users land on it.
  private readonly doneHeading = viewChild<ElementRef<HTMLElement>>('doneHeading');

  constructor() {
    effect(() => this.doneHeading()?.nativeElement.focus());
  }

  protected readonly processing = computed(() => this.run().status() === 'processing');
  protected readonly resultSize = computed(() => {
    const result = this.run().result();
    return result ? formatBytes(result.blob.size) : '';
  });

  protected download(): void {
    const result = this.run().result();
    if (result) {
      downloadBlob(result.blob, result.filename, this.document);
    }
  }
}

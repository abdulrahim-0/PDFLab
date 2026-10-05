import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  ACCEPT_ATTRIBUTE,
  DEFAULT_MAX_FILE_BYTES,
  FileKind,
  formatBytes,
  validateFiles,
} from '../../core/files/file-validation';
import { ToastService } from '../../core/toast/toast.service';
import { Icon } from '../icon';

/**
 * Drag-and-drop or click-to-browse file picker. Emits only files that pass
 * validation; rejected files are reported through a toast.
 */
@Component({
  selector: 'app-file-dropzone',
  imports: [Icon],
  host: { class: 'block' },
  template: `
    <div
      class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors"
      [class]="zoneClass()"
      (dragenter)="onDragEnter($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
    >
      @if (!compact()) {
        <div
          class="flex size-12 items-center justify-center rounded-full bg-surface-container-low text-primary-container dark:text-primary"
        >
          <app-icon class="size-6" name="upload" />
        </div>
      }
      <button
        type="button"
        class="btn"
        [class]="compact() ? 'btn-secondary' : 'btn-primary h-12 px-6 text-base'"
        (click)="input.click()"
      >
        @if (compact()) {
          <app-icon class="size-4" name="plus" />
        }
        {{ label() }}
      </button>
      <p class="text-xs text-secondary">
        or drop {{ multiple() ? 'files' : 'a file' }} here · up to {{ maxSizeLabel() }} each
      </p>
      <input
        #input
        class="sr-only"
        type="file"
        tabindex="-1"
        aria-hidden="true"
        [accept]="acceptAttribute()"
        [multiple]="multiple()"
        (change)="onInputChange(input)"
      />
    </div>
  `,
})
export class FileDropzone {
  private readonly toast = inject(ToastService);

  readonly kind = input<FileKind>('pdf');
  readonly multiple = input(true);
  readonly maxFileBytes = input(DEFAULT_MAX_FILE_BYTES);
  readonly maxFiles = input<number>();
  readonly existingCount = input(0);
  readonly label = input('Select PDF files');
  readonly compact = input(false);
  readonly filesAdded = output<File[]>();

  protected readonly dragging = signal(false);
  private dragDepth = 0;

  protected readonly zoneClass = computed(() =>
    [
      this.compact() ? 'gap-2 px-4 py-5' : 'gap-4 px-6 py-14',
      this.dragging()
        ? 'border-primary-container bg-surface-container'
        : 'border-outline-variant bg-surface-container-lowest',
    ].join(' '),
  );

  protected acceptAttribute(): string {
    return ACCEPT_ATTRIBUTE[this.kind()];
  }

  protected maxSizeLabel(): string {
    return formatBytes(this.maxFileBytes());
  }

  protected onDragEnter(event: DragEvent): void {
    if (!hasFiles(event)) {
      return;
    }
    event.preventDefault();
    this.dragDepth++;
    this.dragging.set(true);
  }

  protected onDragOver(event: DragEvent): void {
    if (!hasFiles(event)) {
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  protected onDragLeave(): void {
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    this.dragging.set(this.dragDepth > 0);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    void this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  protected onInputChange(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    // Clear so picking the same file again still fires a change event.
    input.value = '';
    void this.addFiles(files);
  }

  private async addFiles(files: File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    const picked = this.multiple() ? files : files.slice(0, 1);
    const { accepted, rejected } = await validateFiles(picked, {
      kind: this.kind(),
      maxFileBytes: this.maxFileBytes(),
      maxFiles: this.maxFiles(),
      existingCount: this.existingCount(),
    });
    for (const { file, reason } of rejected) {
      this.toast.error(`${file.name}: ${reason}`);
    }
    if (accepted.length > 0) {
      this.filesAdded.emit(accepted);
    }
  }
}

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false;
}

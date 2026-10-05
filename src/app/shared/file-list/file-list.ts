import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { formatBytes } from '../../core/files/file-validation';
import { PdfToolError } from '../../core/pdf/pdf-errors';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { Icon } from '../icon';
import { PdfThumbnail } from '../pdf-thumbnail/pdf-thumbnail';
import { FileItem, ReorderEvent } from './file-item';

type PageCount = number | 'loading' | 'encrypted' | 'error';

/**
 * Selected files with a preview, size and page count. When `reorderable`,
 * rows can be dragged, or moved with the up/down buttons from the keyboard.
 */
@Component({
  selector: 'app-file-list',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, Icon, PdfThumbnail],
  host: { class: 'block' },
  template: `
    <ol
      class="flex flex-col gap-2"
      cdkDropList
      [cdkDropListDisabled]="!reorderable()"
      (cdkDropListDropped)="onDrop($event)"
      [attr.aria-label]="'Selected files (' + items().length + ')'"
    >
      @for (item of items(); track item.id; let i = $index, first = $first, last = $last) {
        <li
          class="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-2 pr-3"
          cdkDrag
          cdkDragLockAxis="y"
        >
          @if (reorderable()) {
            <span
              class="hidden cursor-grab text-outline active:cursor-grabbing sm:inline-flex"
              cdkDragHandle
              aria-hidden="true"
            >
              <app-icon class="size-5" name="grip" />
            </span>
          }
          <app-pdf-thumbnail class="shrink-0" [file]="item.file" [width]="44" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" [title]="item.file.name">
              {{ item.file.name }}
            </p>
            <p class="text-xs text-secondary">
              {{ size(item.file) }}
              @switch (pageCount(item)) {
                @case ('loading') {}
                @case ('encrypted') {
                  · <span class="text-error">Password-protected</span>
                }
                @case ('error') {
                  · <span class="text-error">Can’t read this file</span>
                }
                @default {
                  · {{ pageCount(item) }} {{ pageCount(item) === 1 ? 'page' : 'pages' }}
                }
              }
            </p>
          </div>
          @if (reorderable()) {
            <button
              type="button"
              class="rounded p-1.5 text-secondary hover:bg-surface-container-low disabled:opacity-30"
              [disabled]="first"
              [attr.aria-label]="'Move ' + item.file.name + ' up'"
              (click)="move(i, i - 1)"
            >
              <app-icon class="size-4" name="chevron-up" />
            </button>
            <button
              type="button"
              class="rounded p-1.5 text-secondary hover:bg-surface-container-low disabled:opacity-30"
              [disabled]="last"
              [attr.aria-label]="'Move ' + item.file.name + ' down'"
              (click)="move(i, i + 1)"
            >
              <app-icon class="size-4" name="chevron-down" />
            </button>
          }
          <button
            type="button"
            class="rounded p-1.5 text-secondary hover:bg-surface-container-low hover:text-error"
            [attr.aria-label]="'Remove ' + item.file.name"
            (click)="remove.emit(item.id)"
          >
            <app-icon class="size-4" name="close" />
          </button>
        </li>
      }
    </ol>
    <p class="sr-only" aria-live="polite">{{ announcement() }}</p>
  `,
})
export class FileList {
  private readonly renderer = inject(PdfRenderService);

  readonly items = input.required<readonly FileItem[]>();
  readonly reorderable = input(false);
  readonly remove = output<string>();
  readonly reorder = output<ReorderEvent>();

  protected readonly announcement = signal('');
  private readonly pageCounts = signal<ReadonlyMap<File, PageCount>>(new Map());

  constructor() {
    effect(() => {
      for (const { file } of this.items()) {
        if (!this.pageCounts().has(file)) {
          this.setPageCount(file, 'loading');
          this.renderer.getPageCount(file).then(
            (count) => this.setPageCount(file, count),
            (error: unknown) =>
              this.setPageCount(
                file,
                error instanceof PdfToolError && error.code === 'encrypted' ? 'encrypted' : 'error',
              ),
          );
        }
      }
    });
  }

  protected size(file: File): string {
    return formatBytes(file.size);
  }

  protected pageCount(item: FileItem): PageCount {
    return this.pageCounts().get(item.file) ?? 'loading';
  }

  protected onDrop(event: CdkDragDrop<unknown>): void {
    this.move(event.previousIndex, event.currentIndex);
  }

  protected move(from: number, to: number): void {
    if (from === to || to < 0 || to >= this.items().length) {
      return;
    }
    const name = this.items()[from].file.name;
    this.reorder.emit({ from, to });
    this.announcement.set(`${name} moved to position ${to + 1} of ${this.items().length}.`);
  }

  private setPageCount(file: File, count: PageCount): void {
    this.pageCounts.update((counts) => new Map(counts).set(file, count));
  }
}

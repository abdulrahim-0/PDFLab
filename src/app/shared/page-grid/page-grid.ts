import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output, TemplateRef } from '@angular/core';
import { ReorderEvent } from '../file-list/file-item';
import { PdfThumbnail } from '../pdf-thumbnail/pdf-thumbnail';

export interface PageActionContext {
  $implicit: number;
  index: number;
  first: boolean;
  last: boolean;
}

/**
 * Thumbnails of a PDF's pages.
 * - `order`: which pages to show, in what order (default: all, in order).
 * - `marks`: badge per page; unmarked pages are dimmed while any marks are set.
 * - `dimmed`: pages to fade out (e.g. pages marked for deletion).
 * - `rotations`: extra clockwise rotation to preview per page.
 * - `actions`: template rendered under each page, given the page number.
 */
@Component({
  selector: 'app-page-grid',
  imports: [CdkDrag, CdkDropList, NgTemplateOutlet, PdfThumbnail],
  host: { class: 'block' },
  template: `
    <ol
      class="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3"
      cdkDropList
      cdkDropListOrientation="mixed"
      [cdkDropListDisabled]="!reorderable()"
      (cdkDropListDropped)="onDrop($event)"
      [attr.aria-label]="'Pages (' + pages().length + ')'"
    >
      @for (page of pages(); track page; let i = $index, first = $first, last = $last) {
        @let mark = marks()?.get(page);
        @let rotation = rotations()?.get(page) ?? 0;
        <li
          class="flex flex-col items-center gap-1.5 rounded-lg p-1.5"
          [class.bg-surface-container-low]="!!mark"
          [class.cursor-grab]="reorderable()"
          cdkDrag
        >
          <div
            class="relative flex size-28 items-center justify-center transition-opacity"
            [class.opacity-35]="isDimmed(page, mark)"
          >
            <app-pdf-thumbnail
              class="transition-transform duration-200"
              [file]="file()"
              [page]="page"
              [width]="80"
              [alt]="'Page ' + page"
              [class.ring-2]="!!mark"
              [class.ring-primary-container]="!!mark"
              [style.transform]="rotation ? 'rotate(' + rotation + 'deg) scale(0.8)' : null"
              [attr.data-rotation]="rotation || null"
            />
            @if (mark) {
              <span
                class="absolute top-0 right-0 rounded-full bg-primary-container px-1.5 py-0.5 text-[0.625rem] leading-none font-semibold text-on-primary"
                >{{ mark }}</span
              >
            }
          </div>
          <span class="text-xs text-secondary">{{ page }}</span>
          @if (actions(); as actions) {
            <ng-container
              [ngTemplateOutlet]="actions"
              [ngTemplateOutletContext]="{ $implicit: page, index: i, first, last }"
            />
          }
        </li>
      }
    </ol>
  `,
})
export class PageGrid {
  readonly file = input.required<File>();
  readonly pageCount = input.required<number>();
  readonly order = input<readonly number[]>();
  readonly marks = input<ReadonlyMap<number, string>>();
  readonly dimmed = input<ReadonlySet<number>>();
  readonly rotations = input<ReadonlyMap<number, number>>();
  readonly reorderable = input(false);
  readonly actions = input<TemplateRef<PageActionContext>>();
  readonly reorder = output<ReorderEvent>();

  protected readonly pages = computed(
    () => this.order() ?? Array.from({ length: this.pageCount() }, (_, i) => i + 1),
  );

  protected isDimmed(page: number, mark: string | undefined): boolean {
    return (!!this.marks() && !mark) || !!this.dimmed()?.has(page);
  }

  protected onDrop(event: CdkDragDrop<unknown>): void {
    if (event.previousIndex !== event.currentIndex) {
      this.reorder.emit({ from: event.previousIndex, to: event.currentIndex });
    }
  }
}

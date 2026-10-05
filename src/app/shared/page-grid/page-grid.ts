import { Component, computed, input } from '@angular/core';
import { PdfThumbnail } from '../pdf-thumbnail/pdf-thumbnail';

/**
 * Thumbnails of every page in a PDF. Pages listed in `marks` get a highlight
 * and badge; when `marks` is set, the others are dimmed.
 */
@Component({
  selector: 'app-page-grid',
  imports: [PdfThumbnail],
  host: { class: 'block' },
  template: `
    <ol class="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-3">
      @for (page of pages(); track page) {
        @let mark = marks()?.get(page);
        <li
          class="flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-opacity"
          [class.opacity-40]="marks() && !mark"
          [class.bg-surface-container-low]="!!mark"
        >
          <div class="relative">
            <app-pdf-thumbnail
              [file]="file()"
              [page]="page"
              [width]="96"
              [alt]="'Page ' + page"
              [class.ring-2]="!!mark"
              [class.ring-primary-container]="!!mark"
            />
            @if (mark) {
              <span
                class="absolute -top-2 -right-2 rounded-full bg-primary-container px-1.5 py-0.5 text-[0.625rem] leading-none font-semibold text-on-primary"
                >{{ mark }}</span
              >
            }
          </div>
          <span class="text-xs text-secondary">{{ page }}</span>
        </li>
      }
    </ol>
  `,
})
export class PageGrid {
  readonly file = input.required<File>();
  readonly pageCount = input.required<number>();
  /** Page number → short badge text. */
  readonly marks = input<ReadonlyMap<number, string>>();

  protected readonly pages = computed(() =>
    Array.from({ length: this.pageCount() }, (_, i) => i + 1),
  );
}

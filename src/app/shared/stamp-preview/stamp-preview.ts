import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { BoxPosition, boxCenter, Point, tileCenters } from '../../core/pdf/placement';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { PdfThumbnail } from '../pdf-thumbnail/pdf-thumbnail';

export interface PreviewMark {
  /** Text to show, or an image URL. */
  text?: string;
  imageUrl?: string;
  /** Size in points, or (for images) a fraction of the page width plus height/width ratio. */
  size: { width: number; height: number } | { fraction: number; ratio: number };
  fontSize?: number;
  color?: string;
  bold?: boolean;
  opacity: number;
  angle: number;
  position: BoxPosition;
  tile: boolean;
}

const PREVIEW_WIDTH = 280;

/** An approximate, live preview of a stamp (watermark, page number…) on one page. */
@Component({
  selector: 'app-stamp-preview',
  imports: [PdfThumbnail],
  host: { class: 'block' },
  template: `
    @if (pageSize(); as size) {
      <figure class="mx-auto flex w-fit flex-col items-center gap-2">
        <div class="relative overflow-hidden rounded-md shadow-md" aria-hidden="true">
          <app-pdf-thumbnail
            [file]="file()"
            [page]="page()"
            [width]="previewWidth"
            [aspectRatio]="size.width + ' / ' + size.height"
          />
          @for (center of centers(); track $index) {
            <div
              class="stamp-mark pointer-events-none absolute whitespace-nowrap"
              [style.left.px]="center.x * scale()"
              [style.bottom.px]="center.y * scale()"
              [style.opacity]="mark().opacity"
              [style.transform]="'translate(-50%, 50%) rotate(' + -mark().angle + 'deg)'"
            >
              @if (mark().imageUrl; as url) {
                <img [src]="url" alt="" [style.width.px]="box().width * scale()" />
              } @else {
                <span
                  class="block leading-none"
                  [class.font-bold]="mark().bold ?? true"
                  [style.font-family]="'Helvetica, Arial, sans-serif'"
                  [style.font-size.px]="(mark().fontSize ?? 12) * scale()"
                  [style.color]="mark().color"
                  >{{ mark().text }}</span
                >
              }
            </div>
          }
        </div>
        <figcaption class="text-xs text-secondary">Preview of page {{ page() }}</figcaption>
      </figure>
    }
  `,
})
export class StampPreview {
  private readonly renderer = inject(PdfRenderService);

  readonly file = input.required<File>();
  readonly mark = input.required<PreviewMark>();
  readonly page = input(1);
  /** Distance from the page edge, in points, for non-tiled marks. */
  readonly margin = input(36);

  protected readonly previewWidth = PREVIEW_WIDTH;
  protected readonly pageSize = signal<{ width: number; height: number } | null>(null);
  protected readonly scale = computed(() => PREVIEW_WIDTH / (this.pageSize()?.width ?? 1));

  /** The mark's size on the page, in points. */
  protected readonly box = computed(() => {
    const { size } = this.mark();
    if ('width' in size) {
      return size;
    }
    const width = (this.pageSize()?.width ?? 0) * size.fraction;
    return { width, height: width * size.ratio };
  });

  protected readonly centers = computed<Point[]>(() => {
    const size = this.pageSize();
    const { angle, position, tile } = this.mark();
    const { width, height } = this.box();
    if (!size) {
      return [];
    }
    return tile
      ? tileCenters(size.width, size.height, width, height, angle)
      : [boxCenter(size.width, size.height, width, height, angle, position, this.margin())];
  });

  constructor() {
    effect((onCleanup) => {
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.renderer.getPageSize(this.file(), this.page()).then(
        (size) => !cancelled && this.pageSize.set(size),
        () => !cancelled && this.pageSize.set(null),
      );
    });
  }
}

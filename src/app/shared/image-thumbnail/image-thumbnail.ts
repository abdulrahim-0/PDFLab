import { Component, computed, effect, input } from '@angular/core';

/** Preview of an image file. Browsers apply EXIF rotation, matching the PDF output. */
@Component({
  selector: 'app-image-thumbnail',
  host: {
    class:
      'relative flex items-center justify-center overflow-hidden rounded-md border border-outline-variant bg-surface-container',
    '[style.width.px]': 'width()',
    '[style.aspect-ratio]': '"1 / 1.3"',
  },
  template: `<img class="h-full w-full object-cover" [src]="url()" [alt]="alt()" />`,
})
export class ImageThumbnail {
  readonly file = input.required<File>();
  readonly width = input(64);
  readonly alt = input('');

  protected readonly url = computed(() => URL.createObjectURL(this.file()));

  constructor() {
    effect((onCleanup) => {
      const url = this.url();
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }
}

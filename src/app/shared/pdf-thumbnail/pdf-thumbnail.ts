import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { PdfRenderService } from '../../core/pdf/pdf-render.service';
import { Icon } from '../icon';

type ThumbnailState =
  { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' };

/** A page preview that only renders once it scrolls into view. */
@Component({
  selector: 'app-pdf-thumbnail',
  imports: [Icon],
  host: {
    class:
      'relative flex items-center justify-center overflow-hidden rounded-md border border-outline-variant bg-white',
    '[style.width.px]': 'width()',
    '[style.aspect-ratio]': '"1 / 1.3"',
  },
  template: `
    @switch (state().status) {
      @case ('loading') {
        <div class="absolute inset-0 animate-pulse bg-surface-container"></div>
      }
      @case ('error') {
        <app-icon class="size-5 text-outline" name="file" />
      }
      @case ('ready') {
        <img class="max-h-full max-w-full object-contain" [src]="url()" [alt]="alt()" />
      }
    }
  `,
})
export class PdfThumbnail {
  private readonly renderer = inject(PdfRenderService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly file = input.required<File>();
  readonly page = input(1);
  /** Display width in CSS pixels. */
  readonly width = input(64);
  readonly alt = input('');

  protected readonly state = signal<ThumbnailState>({ status: 'loading' });
  private readonly visible = signal(false);

  constructor() {
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') {
        this.visible.set(true);
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            this.visible.set(true);
            observer.disconnect();
          }
        },
        { rootMargin: '200px' },
      );
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    effect((onCleanup) => {
      if (!this.visible()) {
        return;
      }
      let cancelled = false;
      onCleanup(() => (cancelled = true));
      this.state.set({ status: 'loading' });
      const pixelWidth = this.width() * Math.min(globalThis.devicePixelRatio || 1, 2);
      this.renderer.renderThumbnail(this.file(), this.page(), pixelWidth).then(
        (url) => !cancelled && this.state.set({ status: 'ready', url }),
        () => !cancelled && this.state.set({ status: 'error' }),
      );
    });
  }

  protected url(): string {
    const state = this.state();
    return state.status === 'ready' ? state.url : '';
  }
}

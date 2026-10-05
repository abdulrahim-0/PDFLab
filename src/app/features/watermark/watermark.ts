import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  ImageWatermark,
  isStandardFontText,
  Watermark as WatermarkSpec,
  WatermarkLayout,
} from '../../core/pdf/ops/watermark';
import { BoxPosition } from '../../core/pdf/placement';
import { PdfService } from '../../core/pdf/pdf.service';
import { rasterizeText } from '../../core/pdf/text-raster';
import { FileDropzone } from '../../shared/file-dropzone/file-dropzone';
import { OptionGroup } from '../../shared/option-group/option-group';
import { PositionPicker } from '../../shared/position-picker/position-picker';
import { RangeField } from '../../shared/range-field/range-field';
import { injectSinglePdf } from '../../shared/single-pdf/single-pdf';
import { SinglePdfWorkspace } from '../../shared/single-pdf/single-pdf-workspace';
import { ToolPage } from '../../shared/tool-page/tool-page';
import { ToolRun } from '../../shared/tool-page/tool-run';
import { PreviewMark, WatermarkPreview } from './watermark-preview';

type Kind = 'text' | 'image';
type Angle = '0' | '45' | '-45';

/** Approximate width of Helvetica Bold glyphs, for the preview only. */
const AVERAGE_CHAR_WIDTH = 0.62;

@Component({
  selector: 'app-watermark',
  imports: [
    FileDropzone,
    OptionGroup,
    PositionPicker,
    RangeField,
    SinglePdfWorkspace,
    ToolPage,
    WatermarkPreview,
  ],
  templateUrl: './watermark.html',
})
export class Watermark {
  private readonly pdf = inject(PdfService);

  protected readonly source = injectSinglePdf();
  protected readonly run = new ToolRun();

  protected readonly kind = signal<Kind>('text');
  protected readonly text = signal('CONFIDENTIAL');
  protected readonly fontSize = signal(60);
  protected readonly color = signal('#d32f2f');
  protected readonly image = signal<File | null>(null);
  protected readonly imageSize = signal(40);
  protected readonly opacity = signal(30);
  protected readonly angle = signal<Angle>('45');
  protected readonly position = signal<BoxPosition>({ v: 'middle', h: 'center' });
  protected readonly tile = signal(false);
  private readonly imageInfo = signal<{ url: string; ratio: number } | null>(null);

  protected readonly kinds = [
    { value: 'text' as const, label: 'Text' },
    { value: 'image' as const, label: 'Image' },
  ];
  protected readonly angles = [
    { value: '0' as const, label: 'Straight' },
    { value: '45' as const, label: 'Diagonal ↗' },
    { value: '-45' as const, label: 'Diagonal ↘' },
  ];

  /** Scripts the built-in font can't draw are added as an image of the text. */
  protected readonly needsRaster = computed(() => !isStandardFontText(this.text().trim()));

  protected readonly ready = computed(() =>
    this.kind() === 'text' ? this.text().trim().length > 0 : !!this.image(),
  );

  protected readonly previewMark = computed<PreviewMark | null>(() => {
    const layout = {
      opacity: this.opacity() / 100,
      angle: Number(this.angle()),
      position: this.position(),
      tile: this.tile(),
    };
    if (this.kind() === 'text') {
      const text = this.text().trim();
      if (!text) {
        return null;
      }
      const size = this.fontSize();
      return {
        ...layout,
        text,
        fontSize: size,
        color: this.color(),
        size: { width: text.length * size * AVERAGE_CHAR_WIDTH, height: size * 0.72 },
      };
    }
    const info = this.imageInfo();
    if (!info) {
      return null;
    }
    return {
      ...layout,
      imageUrl: info.url,
      size: { fraction: this.imageSize() / 100, ratio: info.ratio },
    };
  });

  constructor() {
    effect((onCleanup) => {
      const file = this.image();
      if (!file) {
        this.imageInfo.set(null);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => this.imageInfo.set({ url, ratio: img.naturalHeight / img.naturalWidth });
      img.src = url;
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  protected add([file]: File[]): void {
    this.run.reset();
    this.source.set(file);
  }

  protected setImage([file]: File[]): void {
    this.set(this.image.set, file);
  }

  protected set<T>(setter: (value: T) => void, value: T): void {
    setter(value);
    if (this.run.status() === 'error') {
      this.run.reset();
    }
  }

  protected apply(): Promise<void> {
    const file = this.source.file();
    if (!file || !this.ready()) {
      return Promise.resolve();
    }
    return this.run.run(async (onProgress) =>
      this.pdf.watermark(file, await this.buildWatermark(), onProgress),
    );
  }

  protected startOver(): void {
    this.source.clear();
    this.run.reset();
  }

  private async buildWatermark(): Promise<WatermarkSpec> {
    const layout: WatermarkLayout = {
      opacity: this.opacity() / 100,
      angle: Number(this.angle()),
      position: this.position(),
      tile: this.tile(),
    };
    if (this.kind() === 'image') {
      const image = this.image()!;
      return {
        ...layout,
        kind: 'image',
        image: { name: image.name, data: await image.arrayBuffer() },
        width: { fraction: this.imageSize() / 100 },
      };
    }
    const text = this.text().trim();
    if (!this.needsRaster()) {
      return { ...layout, kind: 'text', text, fontSize: this.fontSize(), color: this.color() };
    }
    const raster = await rasterizeText(text, { fontSize: this.fontSize(), color: this.color() });
    const watermark: ImageWatermark = {
      ...layout,
      kind: 'image',
      image: { name: 'watermark-text.png', data: raster.png },
      width: { points: raster.width },
    };
    return watermark;
  }
}

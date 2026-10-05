import { Type } from '@angular/core';
import { IconName } from '../shared/icon';

export interface ToolDefinition {
  id: string;
  /** URL segment, e.g. `merge-pdf`. */
  path: string;
  title: string;
  description: string;
  icon: IconName;
  loadComponent: () => Promise<Type<unknown>>;
}

/** Every finished tool. The home grid and the routes are both built from this list. */
export const TOOLS: readonly ToolDefinition[] = [
  {
    id: 'merge',
    path: 'merge-pdf',
    title: 'Merge PDF',
    description: 'Combine multiple PDFs into one file, in the order you choose.',
    icon: 'merge',
    loadComponent: () => import('../features/merge/merge').then((m) => m.Merge),
  },
  {
    id: 'split',
    path: 'split-pdf',
    title: 'Split PDF',
    description: 'Pull out page ranges as separate PDFs, or save every page as its own file.',
    icon: 'split',
    loadComponent: () => import('../features/split/split').then((m) => m.Split),
  },
  {
    id: 'organize',
    path: 'organize-pdf',
    title: 'Organize PDF',
    description: 'Reorder pages by dragging, or delete the ones you don’t need.',
    icon: 'organize',
    loadComponent: () => import('../features/organize/organize').then((m) => m.Organize),
  },
  {
    id: 'rotate',
    path: 'rotate-pdf',
    title: 'Rotate PDF',
    description: 'Turn individual pages or the whole document, without losing quality.',
    icon: 'rotate',
    loadComponent: () => import('../features/rotate/rotate').then((m) => m.Rotate),
  },
  {
    id: 'compress',
    path: 'compress-pdf',
    title: 'Compress PDF',
    description: 'Shrink PDFs with photos or scans by re-compressing their images.',
    icon: 'compress',
    loadComponent: () => import('../features/compress/compress').then((m) => m.Compress),
  },
  {
    id: 'images-to-pdf',
    path: 'jpg-to-pdf',
    title: 'Images to PDF',
    description: 'Turn JPG and PNG images into a PDF, one image per page.',
    icon: 'image',
    loadComponent: () =>
      import('../features/images-to-pdf/images-to-pdf').then((m) => m.ImagesToPdf),
  },
  {
    id: 'pdf-to-images',
    path: 'pdf-to-jpg',
    title: 'PDF to Images',
    description: 'Save PDF pages as JPG or PNG images, at the resolution you need.',
    icon: 'images',
    loadComponent: () =>
      import('../features/pdf-to-images/pdf-to-images').then((m) => m.PdfToImages),
  },
  {
    id: 'watermark',
    path: 'add-watermark',
    title: 'Add Watermark',
    description: 'Stamp text or an image over your pages, at any angle or position.',
    icon: 'watermark',
    loadComponent: () => import('../features/watermark/watermark').then((m) => m.Watermark),
  },
  {
    id: 'page-numbers',
    path: 'add-page-numbers',
    title: 'Add Page Numbers',
    description: 'Number your pages, with the position, style and starting number you want.',
    icon: 'page-numbers',
    loadComponent: () => import('../features/page-numbers/page-numbers').then((m) => m.PageNumbers),
  },
  {
    id: 'protect',
    path: 'protect-pdf',
    title: 'Protect PDF',
    description: 'Lock a PDF with a password using strong AES-256 encryption.',
    icon: 'lock',
    loadComponent: () => import('../features/protect/protect').then((m) => m.Protect),
  },
  {
    id: 'unlock',
    path: 'unlock-pdf',
    title: 'Unlock PDF',
    description: 'Remove the password from a PDF you can open, or lift its restrictions.',
    icon: 'unlock',
    loadComponent: () => import('../features/unlock/unlock').then((m) => m.Unlock),
  },
];

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
];

import { Routes } from '@angular/router';
import { TOOLS } from './core/tools';
import { Home } from './features/home/home';

export const routes: Routes = [
  { path: '', component: Home, title: 'PDFLab · Private PDF tools in your browser' },
  ...TOOLS.map((tool) => ({
    path: tool.path,
    loadComponent: tool.loadComponent,
    title: `${tool.title} · PDFLab`,
  })),
  { path: '**', redirectTo: '' },
];

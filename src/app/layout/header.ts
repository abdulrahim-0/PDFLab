import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeMode, ThemeService } from '../core/theme/theme.service';
import { Icon, IconName } from '../shared/icon';
import { Logo } from '../shared/logo';

const THEME_LABELS: Record<ThemeMode, string> = { system: 'System', light: 'Light', dark: 'Dark' };
const THEME_ICONS: Record<ThemeMode, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };

@Component({
  selector: 'app-header',
  imports: [Icon, Logo, RouterLink],
  template: `
    <header
      class="sticky top-0 z-40 border-b border-outline-variant bg-surface/85 pt-[env(safe-area-inset-top)] backdrop-blur"
    >
      <div class="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <a routerLink="/" class="rounded-md" aria-label="PDFLab home">
          <app-logo />
        </a>
        <nav class="flex items-center gap-1" aria-label="Main">
          <a
            routerLink="/"
            class="rounded-md px-3 py-2 text-sm font-medium text-secondary hover:text-on-surface"
            >All tools</a
          >
          <button
            type="button"
            class="rounded-md p-2 text-secondary hover:bg-surface-container-low hover:text-on-surface"
            [attr.aria-label]="themeLabel()"
            [title]="themeLabel()"
            (click)="theme.cycle()"
          >
            <app-icon class="size-5" [name]="themeIcon()" />
          </button>
        </nav>
      </div>
    </header>
  `,
})
export class Header {
  protected readonly theme = inject(ThemeService);
  protected readonly themeIcon = computed(() => THEME_ICONS[this.theme.mode()]);
  protected readonly themeLabel = computed(
    () => `Theme: ${THEME_LABELS[this.theme.mode()]}. Click to change.`,
  );
}

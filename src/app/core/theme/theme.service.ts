import { computed, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pdflab-theme';
const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Light/dark mode. index.html applies the stored choice before Angular boots,
 * so there's no flash of the wrong theme; this service keeps it in sync after.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly mode = signal<ThemeMode>(this.readStoredMode());
  readonly isDark = computed(() =>
    this.mode() === 'system' ? this.systemDark() : this.mode() === 'dark',
  );

  constructor() {
    this.media?.addEventListener('change', (event) => this.systemDark.set(event.matches));
    effect(() => {
      const root = this.document.documentElement;
      root.classList.toggle('dark', this.isDark());
      root.style.colorScheme = this.isDark() ? 'dark' : 'light';
    });
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage can be unavailable (private mode, disabled cookies); the choice still applies.
    }
  }

  /** Cycles system → light → dark. */
  cycle(): void {
    this.setMode(MODES[(MODES.indexOf(this.mode()) + 1) % MODES.length]);
  }

  private readStoredMode(): ThemeMode {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(THEME_STORAGE_KEY);
      return MODES.includes(stored as ThemeMode) ? (stored as ThemeMode) : 'system';
    } catch {
      return 'system';
    }
  }
}

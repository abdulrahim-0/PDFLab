import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  // Node 26's built-in localStorage shadows jsdom's and is unusable without a
  // backing file, so tests supply their own.
  let storage: Map<string, string>;

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to following the system', () => {
    expect(TestBed.inject(ThemeService).mode()).toBe('system');
  });

  it('restores the saved mode', () => {
    storage.set(THEME_STORAGE_KEY, 'dark');
    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
  });

  it('cycles modes, saves the choice and applies the dark class', () => {
    const theme = TestBed.inject(ThemeService);
    theme.setMode('light');

    theme.cycle();
    TestBed.tick();

    expect(theme.mode()).toBe('dark');
    expect(storage.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    theme.cycle();
    expect(theme.mode()).toBe('system');
  });
});

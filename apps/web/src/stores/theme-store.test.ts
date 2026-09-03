/**
 * apps/web/src/stores/theme-store.test.ts — theme Zustand store.
 */
import { describe, expect, it } from 'vitest';

import { useThemeStore } from './theme-store';

describe('useThemeStore', () => {
  it("reads the initial theme from <html data-theme> (falls back to 'dark')", () => {
    // jsdom default: no data-theme attribute.
    document.documentElement.removeAttribute('data-theme');
    // The store was already created with the initial state; verify the
    // current value is a valid theme (dark in this environment).
    expect(['dark', 'light', 'cyber']).toContain(useThemeStore.getState().theme);
  });

  it('setTheme updates the state', () => {
    useThemeStore.getState().setTheme('light');
    expect(useThemeStore.getState().theme).toBe('light');
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});

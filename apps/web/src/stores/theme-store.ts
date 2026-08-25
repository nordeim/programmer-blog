/**
 * apps/web/src/stores/theme-store.ts — Zustand store for theme state.
 *
 * Reads the initial theme from <html data-theme="..."> (set by the
 * server from the cookie). Updates persist to localStorage + cookie
 * via the use-theme hook.
 */
'use client';

import { create } from 'zustand';

import { isValidTheme, type Theme } from '@/domain/theme';

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  return isValidTheme(attr) ? attr : 'dark';
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: readInitialTheme(),
  setTheme: (theme) => set({ theme }),
}));

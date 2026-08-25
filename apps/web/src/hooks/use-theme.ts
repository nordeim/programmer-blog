/**
 * apps/web/src/hooks/use-theme.ts — FR-4 + FR-14.
 *
 * Wraps the Zustand theme-store (created in Phase 3). Adds the 'T'
 * keyboard shortcut to cycle dark → light → cyber → dark (FR-14).
 * Adds the .theme-anim body class toggle for the 700ms transition.
 *
 * Source of truth: landing_page_mockup.html lines 1078-1104, 1253-1262.
 */
'use client';

import { useEffect, useCallback } from 'react';

import { cycleTheme, type Theme } from '@/domain/theme';
import { useThemeStore } from '@/stores/theme-store';

function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  // Briefly add .theme-anim to body for the 0.6s transition.
  document.body.classList.add('theme-anim');
  setTimeout(() => {
    document.body.classList.remove('theme-anim');
  }, 700);

  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem('devlog-theme', theme);
  } catch {
    // localStorage unavailable (SSR, sandboxed iframe) — fall back to cookie only.
  }
  // Cookie so the server reads the theme on the next request (PAD §3.3 Pattern 1).
  document.cookie = `devlog-theme=${theme};path=/;max-age=31536000;samesite=lax`;
}

export function useTheme(): {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycle: () => void;
} {
  const theme = useThemeStore((s) => s.theme);
  const setThemeStore = useThemeStore((s) => s.setTheme);

  // Sync from store to <html> + localStorage + cookie on mount and on theme change.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeStore(next);
    },
    [setThemeStore],
  );

  const cycle = useCallback(() => {
    setThemeStore(cycleTheme(theme));
  }, [theme, setThemeStore]);

  // 'T' keyboard shortcut (FR-14) — ignores when an input/textarea is focused.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        cycle();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cycle]);

  return { theme, setTheme, cycle };
}

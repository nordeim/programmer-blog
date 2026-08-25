/**
 * apps/web/src/domain/theme.ts — Phase 1 minimal theme type + cookie name.
 * Phase 3 will add the use-theme hook and Zustand store that use this module.
 */

export const THEME_COOKIE = 'devlog-theme';
export const THEME_LOCALSTORAGE = 'devlog-theme';
export const VALID_THEMES = ['dark', 'light', 'cyber'] as const;
export type Theme = (typeof VALID_THEMES)[number];

export const THEME_ORDER: readonly Theme[] = VALID_THEMES;

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

export function cycleTheme(theme: Theme): Theme {
  const i = THEME_ORDER.indexOf(theme);
  const next = THEME_ORDER[(i + 1) % THEME_ORDER.length] ?? 'dark';
  return next;
}

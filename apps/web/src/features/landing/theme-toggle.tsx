/**
 * apps/web/src/features/landing/theme-toggle.tsx — FR-4 + FR-14.
 *
 * The 3-button .theme-toggle pill. Renders one .theme-btn per theme
 * (dark/light/cyber). Active button gets .active. Clicking sets the
 * theme via useTheme; 'T' cycles via useTheme's keyboard shortcut.
 *
 * Source: landing_page_mockup.html lines 610-614, 1078-1104.
 */
'use client';

import { THEME_ORDER, type Theme } from '@/domain/theme';
import { useTheme } from '@/hooks/use-theme';

const ICONS: Record<Theme, string> = {
  dark: '🌙',
  light: '☀',
  cyber: '⌨',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Theme selector">
      {THEME_ORDER.map((t) => (
        <button
          key={t}
          type="button"
          className={`theme-btn${theme === t ? ' active' : ''}`}
          data-theme={t}
          title={t.charAt(0).toUpperCase() + t.slice(1)}
          aria-label={`${t} theme`}
          aria-pressed={theme === t}
          onClick={() => setTheme(t)}
        >
          <span aria-hidden="true">{ICONS[t]}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * apps/web/src/features/landing/theme-toggle.test.tsx — FR-4/FR-14.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const setThemeMock = vi.fn();

vi.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: setThemeMock }),
}));

import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('renders one button per theme with aria-pressed on the active one', () => {
    const { getByRole } = render(<ThemeToggle />);
    const group = getByRole('group', { name: 'Theme selector' });
    expect(group).toBeTruthy();
    const dark = getByRole('button', { name: 'dark theme' });
    const light = getByRole('button', { name: 'light theme' });
    const cyber = getByRole('button', { name: 'cyber theme' });
    expect(dark).toHaveAttribute('aria-pressed', 'true');
    expect(light).toHaveAttribute('aria-pressed', 'false');
    expect(cyber).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls setTheme when a button is clicked', () => {
    const { getByRole } = render(<ThemeToggle />);
    fireEvent.click(getByRole('button', { name: 'light theme' }));
    expect(setThemeMock).toHaveBeenCalledWith('light');
  });
});

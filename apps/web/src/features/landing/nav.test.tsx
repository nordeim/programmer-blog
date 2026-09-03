/**
 * apps/web/src/features/landing/nav.test.tsx — FR-2 fixed header nav.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// GitHubPill polls /api/github-stats on mount — stub it out.
vi.mock('./github-pill', () => ({
  GitHubPill: () => <div data-testid="gh-pill-stub" />,
}));

// ThemeToggle uses the useTheme hook — stub to keep this test focused.
vi.mock('./theme-toggle', () => ({
  ThemeToggle: () => <div data-testid="theme-toggle-stub" />,
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_GITHUB_REPO: 'nordeim/programmer-blog',
    GITHUB_STATS_FALLBACK_STARS: 82400,
    GITHUB_STATS_FALLBACK_FORKS: 4180,
  },
}));

import { Nav } from './nav';

describe('Nav', () => {
  it('renders the /dev/log logotype linking to the hero', () => {
    const { getByRole } = render(<Nav />);
    const logo = getByRole('link', { name: /dev/ });
    expect(logo).toHaveAttribute('href', '/#hero');
  });

  it('renders the four center section links', () => {
    const { getByRole } = render(<Nav />);
    for (const name of ['notes', 'snippets', 'archive', 'about']) {
      expect(getByRole('link', { name: new RegExp(`^${name}$`) })).toHaveAttribute(
        'href',
        `/#${name}`,
      );
    }
  });

  it('mounts the GitHub pill and theme toggle', () => {
    const { getByTestId } = render(<Nav />);
    expect(getByTestId('gh-pill-stub')).toBeTruthy();
    expect(getByTestId('theme-toggle-stub')).toBeTruthy();
  });
});

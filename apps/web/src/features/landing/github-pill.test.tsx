/**
 * apps/web/src/features/landing/github-pill.test.tsx — FR-3.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// The hook polls /api/github-stats — stub it with the initial values.
vi.mock('@/hooks/use-github-stats', () => ({
  useGitHubStats: ({ initialStars, initialForks }: { initialStars: number; initialForks: number }) =>
    ({ stars: initialStars, forks: initialForks }),
}));

import { GitHubPill } from './github-pill';

describe('GitHubPill', () => {
  it('renders formatted stars + forks and links to the repo', () => {
    const { getByTestId, getByRole } = render(
      <GitHubPill initialStars={82400} initialForks={4180} href="https://github.com/nordeim/programmer-blog" />,
    );
    const link = getByRole('link');
    expect(link).toHaveAttribute('href', 'https://github.com/nordeim/programmer-blog');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(getByTestId('gh-stars').textContent).toBe('82.4k');
    expect(getByTestId('gh-forks').textContent).toBe('4.2k');
  });
});

/**
 * apps/web/src/features/landing/github-pill.tsx — FR-3.
 *
 * The `.stat-pill` link to GitHub. Receives initial stars/forks from
 * the server-rendered page; client-side polls `/api/github-stats`
 * for live updates + simulated +1 every 9s.
 *
 * Source: landing_page_mockup.html lines 601-608.
 */
'use client';

import { formatNumber } from '@/domain/github';
import { useGitHubStats } from '@/hooks/use-github-stats';

interface GitHubPillProps {
  initialStars: number;
  initialForks: number;
  href: string;
}

export function GitHubPill({ initialStars, initialForks, href }: GitHubPillProps) {
  const { stars, forks } = useGitHubStats({ initialStars, initialForks });

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="stat-pill hidden sm:inline-flex"
      title="Live from GitHub"
    >
      <span className="stat-dot" aria-hidden="true" />
      <span className="text-xs" aria-hidden="true" style={{ color: 'var(--accent)' }}>
        ★
      </span>
      <span data-testid="gh-stars">{formatNumber(stars)}</span>
      <span style={{ color: 'var(--muted)' }}>·</span>
      <span className="text-xs" aria-hidden="true" style={{ color: 'var(--accent-2)' }}>
        ⑂
      </span>
      <span data-testid="gh-forks">{formatNumber(forks)}</span>
    </a>
  );
}

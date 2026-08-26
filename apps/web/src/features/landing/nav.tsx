/**
 * apps/web/src/features/landing/nav.tsx — FR-2.
 *
 * The fixed header navigation. Server component (renders the static
 * logotype + center nav links), but mounts client children for
 * `<GitHubPill>` (live stats) and `<ThemeToggle>`.
 *
 * Source: landing_page_mockup.html lines 586-617.
 */
import Link from 'next/link';

import { env } from '@/lib/env';

import { GitHubPill } from './github-pill';
import { ThemeToggle } from './theme-toggle';

export function Nav() {
  const repo = env.NEXT_PUBLIC_GITHUB_REPO;
  const repoUrl = `https://github.com/${repo}`;
  const fallbackStars = env.GITHUB_STATS_FALLBACK_STARS;
  const fallbackForks = env.GITHUB_STATS_FALLBACK_FORKS;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        background: 'rgba(var(--accent-rgb), 0.02)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/#hero"
          className="font-mono font-bold text-lg flex items-center"
          style={{ color: 'var(--fg)', textDecoration: 'none' }}
        >
          <span style={{ color: 'var(--accent)' }}>/</span>
          dev
          <span style={{ color: 'var(--muted)' }}>/</span>
          log
          <span className="logo-cursor" aria-hidden="true" />
        </Link>

        <div className="hidden md:flex items-center gap-9 font-mono text-sm">
          <Link href="/#notes" className="hover-link">
            notes
          </Link>
          <Link href="/#snippets" className="hover-link">
            snippets
          </Link>
          <Link href="/#archive" className="hover-link">
            archive
          </Link>
          <Link href="/#about" className="hover-link">
            about
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <GitHubPill
            initialStars={fallbackStars}
            initialForks={fallbackForks}
            href={repoUrl}
          />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}

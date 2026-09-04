/**
 * apps/web/src/hooks/use-github-stats.ts — FR-3.
 *
 * Client hook. Receives initial { stars, forks } (from server render).
 * R-93 (Pass 7, L-56): a previous docstring claimed 9-second polling —
 * as built, the hook fetches `/api/github-stats` ONCE on mount and then
 * only simulates a +1 star every 9 seconds on top of the (cached) value
 * (per the mockup, lines 1144-1162). It never re-fetches on errors.
 *
 * Source of truth: landing_page_mockup.html lines 1144-1162.
 */
'use client';

import { useEffect, useRef, useState } from 'react';

import {
  FALLBACK_FORKS,
  FALLBACK_STARS,
  GITHUB_INCR_INTERVAL_MS,
  type GitHubRepoStats,
} from '@/domain/github';

interface UseGitHubStatsArgs {
  initialStars: number;
  initialForks: number;
  poll?: boolean;
}

export function useGitHubStats({
  initialStars,
  initialForks,
  poll = true,
}: UseGitHubStatsArgs): GitHubRepoStats {
  const [stats, setStats] = useState<GitHubRepoStats>({
    stars: initialStars,
    forks: initialForks,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // R-16 (audit remediation): include initialStars and initialForks in the
  // effect's deps so the lint rule is satisfied and the hook re-runs if
  // the parent passes different fallback numbers (the effect is idempotent
  // because fetchOnce always overwrites with fresh API data on success).
  useEffect(() => {
    if (!poll) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    const initialSnapshot = { stars: initialStars, forks: initialForks };

    async function fetchOnce() {
      try {
        const res = await fetch('/api/github-stats', { cache: 'no-store' });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as Partial<GitHubRepoStats>;
        if (
          !cancelled &&
          typeof data.stars === 'number' &&
          typeof data.forks === 'number'
        ) {
          setStats({ stars: data.stars, forks: data.forks });
        }
      } catch {
        if (!cancelled) {
          setStats({
            stars: initialSnapshot.stars || FALLBACK_STARS,
            forks: initialSnapshot.forks || FALLBACK_FORKS,
          });
        }
      }
    }

    fetchOnce();

    // Simulated +1 every 9s on top of the cached value.
    intervalRef.current = setInterval(() => {
      if (cancelled) return;
      setStats((prev) => ({ ...prev, stars: prev.stars + 1 }));
    }, GITHUB_INCR_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll, initialStars, initialForks]);

  return { stars: stats.stars, forks: stats.forks };
}

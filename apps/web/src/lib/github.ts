/**
 * apps/web/src/lib/github.ts — PAD §3.3 Pattern 4.
 *
 * Fetches GitHub repo stats (stars + forks) via the REST API. Uses
 * Next.js `unstable_cache` for a 60-second TTL. On any error
 * (4xx, 5xx, network, JSON parse), returns the fallback constants.
 *
 * Server-only.
 */
import 'server-only';
import { unstable_cache } from 'next/cache';

import {
  FALLBACK_FORKS,
  FALLBACK_STARS,
  GITHUB_CACHE_TTL_SECONDS,
  type GitHubRepoStats,
} from '@/domain/github';
import { env } from '@/lib/env';

async function fetchGitHubStatsUncached(repo: string): Promise<GitHubRepoStats> {
  try {
    const url = `https://api.github.com/repos/${repo}`;
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'devlog-web',
      },
      // Bypass Next.js fetch cache; the unstable_cache wrapper handles TTL.
      cache: 'no-store',
      // R-43 (audit M-36): bound the request so a hung GitHub connection
      // cannot stall /api/github-stats indefinitely; the catch below maps
      // the abort to the fallback stats.
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      throw new Error(`GitHub API status ${res.status}`);
    }
    const data = (await res.json()) as { stargazers_count?: number; forks_count?: number };
    const stars = typeof data.stargazers_count === 'number' ? data.stargazers_count : FALLBACK_STARS;
    const forks = typeof data.forks_count === 'number' ? data.forks_count : FALLBACK_FORKS;
    return { stars, forks };
  } catch {
    return { stars: FALLBACK_STARS, forks: FALLBACK_FORKS };
  }
}

/**
 * Cached GitHub stats fetcher. Tagged by repo so different repos get
 * different cache entries. TTL: GITHUB_CACHE_TTL_SECONDS (60s).
 */
export const getGitHubStats = unstable_cache(
  async (repo: string): Promise<GitHubRepoStats> => fetchGitHubStatsUncached(repo),
  ['github-stats'],
  { revalidate: GITHUB_CACHE_TTL_SECONDS, tags: ['github-stats'] },
);

/**
 * Convenience function that uses the configured repo from env.
 */
export async function getGitHubStatsForConfiguredRepo(): Promise<GitHubRepoStats> {
  return getGitHubStats(env.NEXT_PUBLIC_GITHUB_REPO);
}

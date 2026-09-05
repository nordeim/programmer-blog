/**
 * apps/web/src/domain/github.ts — GitHub repo stats domain.
 *
 * Provides:
 *   - `GitHubRepoStats` type
 *   - `formatNumber(n)` (mockup lines 1148-1152: 82400 → "82.4k")
 *   - `FALLBACK_STARS` / `FALLBACK_FORKS` constants
 *
 * Source of truth: landing_page_mockup.html lines 1144-1152.
 */

export interface GitHubRepoStats {
  stars: number;
  forks: number;
}

export const FALLBACK_STARS = 82400;
export const FALLBACK_FORKS = 4180;
export const GITHUB_CACHE_TTL_SECONDS = 60;
export const GITHUB_INCR_INTERVAL_MS = 9000; // simulated +1 every 9s

/**
 * Format a number using the mockup convention:
 *   42        → "42"
 *   1500      → "1.5k"
 *   82400     → "82.4k"
 *   100000    → "100k"
 *   1000000   → "1.0M"
 */
export function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) {
    // 1500 → "1.5k"
    const k = n / 1000;
    return `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  if (n < 1_000_000) {
    const k = n / 1000;
    // 82400 → 82.4k ; 82000 → 82k (no trailing .0)
    return `${k.toFixed(1).replace(/\.0$/, '')}k`;
  }
  const m = n / 1_000_000;
  return `${m.toFixed(1)}M`;
}

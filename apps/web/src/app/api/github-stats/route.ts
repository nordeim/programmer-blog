/**
 * apps/web/src/app/api/github-stats/route.ts — FR-3 backend.
 *
 * GET /api/github-stats
 *   - Returns { stars, forks } as JSON.
 *   - Cached 60s server-side via `getGitHubStats` (unstable_cache).
 *   - On any error, falls back to the constant fallbacks.
 */
import { NextResponse } from 'next/server';

import { getGitHubStatsForConfiguredRepo } from '@/lib/github';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

export async function GET() {
  try {
    const stats = await getGitHubStatsForConfiguredRepo();
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json(
      { stars: 0, forks: 0, error: 'GitHub stats unavailable' },
      { status: 502 },
    );
  }
}

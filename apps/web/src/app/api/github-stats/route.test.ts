/**
 * apps/web/src/app/api/github-stats/route.test.ts — FR-3 backend route.
 */
import { describe, expect, it, vi } from 'vitest';

const statsMock = vi.fn<() => Promise<{ stars: number; forks: number }>>();

vi.mock('@/lib/github', () => ({
  getGitHubStatsForConfiguredRepo: () => statsMock(),
}));

import { GET } from './route';

describe('GET /api/github-stats', () => {
  it('returns the stats JSON with cache headers', async () => {
    statsMock.mockResolvedValue({ stars: 82400, forks: 4180 });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=60');
    expect(await res.json()).toEqual({ stars: 82400, forks: 4180 });
  });

  it('returns a 502 with the fallback payload when the fetcher throws', async () => {
    statsMock.mockRejectedValue(new Error('network down'));
    const res = await GET();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ stars: 0, forks: 0, error: 'GitHub stats unavailable' });
  });
});

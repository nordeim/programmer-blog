/**
 * apps/web/src/app/api/robots.txt/route.test.ts — FR-24 (R-15 guard).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'https://devlog.example' },
}));

import { GET } from './route';

describe('GET /api/robots.txt', () => {
  it('returns allow-all text with the sitemap link', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/plain');
    const body = await res.text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://devlog.example/sitemap.xml');
  });

  it('ships an hourly cache policy matching its ISR (R-75, M-49)', async () => {
    // The 24h s-maxage let a CDN pin a stale pre-deploy copy for a day
    // (live: localhost sitemap URL served from Cloudflare at age 34507s)
    // even though the ISR revalidates hourly. Must match rss/sitemap.
    const res = await GET();
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600, s-maxage=3600');
  });
});

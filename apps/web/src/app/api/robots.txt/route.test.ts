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
});

/**
 * apps/web/src/next.config.test.ts — R-34 (Pass 3).
 *
 * Pins the documented top-level feed routes (H-32): README "Routes
 * Implemented" lists /rss.xml, /sitemap.xml and /robots.txt; the config
 * even declares Content-Type headers for the first two — but rewrites()
 * returned [] so all three 404'd in production while only the /api/*
 * variants existed. The rewrite table must map the documented URLs onto
 * the API route handlers.
 */
import { describe, expect, it } from 'vitest';

import nextConfig from '../next.config';

describe('next.config rewrites — R-34 / H-32', () => {
  it('maps the documented top-level feed URLs onto /api/* routes', async () => {
    expect(typeof nextConfig.rewrites).toBe('function');

    const result = await (nextConfig.rewrites as () => Promise<
      Array<{ source: string; destination: string }>
    >)();

    // next.config rewrites() returns { beforeFiles, afterFiles, fallback }
    // when given an object, or a flat array when given one. Assert on the
    // flat form (the implementation uses a plain array).
    const rewrites = Array.isArray(result)
      ? result
      : [...(result as { beforeFiles: typeof result }).beforeFiles];

    expect(rewrites).toEqual(
      expect.arrayContaining([
        { source: '/rss.xml', destination: '/api/rss.xml' },
        { source: '/sitemap.xml', destination: '/api/sitemap.xml' },
        { source: '/robots.txt', destination: '/api/robots.txt' },
      ]),
    );
    // And nothing else — the surface stays minimal.
    expect(rewrites).toHaveLength(3);
  });
});

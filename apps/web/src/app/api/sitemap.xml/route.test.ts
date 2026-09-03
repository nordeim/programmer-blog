/**
 * apps/web/src/app/api/sitemap.xml/route.test.ts — FR-24.
 */
import { describe, expect, it, vi } from 'vitest';

const getArchivePostsMock = vi.fn<
  (page: number, pageSize: number) => Promise<{ slug: string; publishedAt?: Date | null }[]>
>();

vi.mock('@devlog/db', () => ({
  getArchivePosts: (page: number, pageSize: number) => getArchivePostsMock(page, pageSize),
}));

vi.mock('@/lib/snippets', () => ({
  listSnippets: vi.fn().mockResolvedValue([{ slug: 'use-scroll-progress' }]),
}));

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'https://devlog.example' },
}));

import { GET } from './route';

describe('GET /api/sitemap.xml', () => {
  it('emits a valid sitemap with static routes, posts and snippets', async () => {
    getArchivePostsMock.mockResolvedValue([
      { slug: 'hello-world', publishedAt: new Date('2026-08-01T00:00:00Z') },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/xml');
    const xml = await res.text();
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('<loc>https://devlog.example/</loc>');
    expect(xml).toContain('<loc>https://devlog.example/archive</loc>');
    expect(xml).toContain('<loc>https://devlog.example/snippets</loc>');
    expect(xml).toContain('<loc>https://devlog.example/posts/hello-world</loc>');
    expect(xml).toContain('<lastmod>2026-08-01</lastmod>');
    expect(xml).toContain('<loc>https://devlog.example/snippets/use-scroll-progress</loc>');
  });

  it('degrades to the minimal sitemap when the DB is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    getArchivePostsMock.mockRejectedValue(new Error('no table'));
    const res = await GET();
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<loc>https://devlog.example/</loc>');
    expect(xml).not.toContain('/posts/');
    warn.mockRestore();
  });

  it('XML-escapes reserved characters in URLs', async () => {
    getArchivePostsMock.mockResolvedValue([{ slug: "a'b<c>&d" }]);
    const res = await GET();
    const xml = await res.text();
    expect(xml).toContain('a&apos;b&lt;c&gt;&amp;d');
  });
});

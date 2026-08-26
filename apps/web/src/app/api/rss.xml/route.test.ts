/**
 * apps/web/src/app/api/rss.xml/route.test.ts — TDD RED+GREEN 5.4.
 *
 * Verifies:
 *   - GET /rss.xml returns 200
 *   - Content-Type is application/rss+xml
 *   - Body is a well-formed RSS 2.0 document
 *   - One <item> per seeded post
 *
 * The DB layer is mocked so the test runs in jsdom without a real SQLite.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const getPostsForRss = vi.fn();
const getSiteSettings = vi.fn();
const getAuthor = vi.fn();

vi.mock('@devlog/db', () => ({
  getPostsForRss: (...args: unknown[]) => getPostsForRss(...(args as never[])),
  getSiteSettings: () => getSiteSettings(),
  getAuthor: () => getAuthor(),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_AUTHOR_EMAIL: 'hi@devlog.example',
  },
}));

import { GET } from './route';

describe('/api/rss.xml', () => {
  beforeEach(() => {
    getPostsForRss.mockReset();
    getSiteSettings.mockReset();
    getAuthor.mockReset();
  });

  it('returns 200 with application/rss+xml content type', async () => {
    getPostsForRss.mockResolvedValue([]);
    getSiteSettings.mockResolvedValue({
      id: 1,
      authorName: 'Alex Rivera',
      authorBio: 'Software engineer writing about the craft.',
      authorAvatarUrl: null,
      socialLinks: {},
      defaultSeoDescription: 'Notes from a programmer\'s desk.',
      defaultOgImageUrl: null,
      updatedAt: new Date(),
    });
    getAuthor.mockResolvedValue({ id: 'u1', name: 'Alex Rivera' });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/rss+xml; charset=utf-8');
  });

  it('returns a well-formed RSS 2.0 document with rss root and channel', async () => {
    getPostsForRss.mockResolvedValue([]);
    getSiteSettings.mockResolvedValue(null);
    getAuthor.mockResolvedValue(null);

    const res = await GET();
    const body = await res.text();
    expect(body).toContain('<?xml version="1.0"');
    expect(body).toContain('<rss version="2.0"');
    expect(body).toContain('<channel>');
    expect(body).toContain('</channel>');
    expect(body.trim().endsWith('</rss>')).toBe(true);
  });

  it('renders one <item> per post', async () => {
    getPostsForRss.mockResolvedValue([
      {
        slug: 'a',
        title: 'A',
        excerpt: 'Excerpt A',
        publishedAt: new Date('2024-11-12T00:00:00Z'),
        authorId: 'u1',
      },
      {
        slug: 'b',
        title: 'B',
        excerpt: 'Excerpt B',
        publishedAt: new Date('2024-10-12T00:00:00Z'),
        authorId: 'u1',
      },
    ]);
    getSiteSettings.mockResolvedValue(null);
    getAuthor.mockResolvedValue(null);

    const res = await GET();
    const body = await res.text();
    expect((body.match(/<item>/g) ?? []).length).toBe(2);
    expect(body).toContain('http://localhost:3000/posts/a');
    expect(body).toContain('http://localhost:3000/posts/b');
  });

  it('renders zero <item> elements when no posts exist', async () => {
    getPostsForRss.mockResolvedValue([]);
    getSiteSettings.mockResolvedValue(null);
    getAuthor.mockResolvedValue(null);
    const res = await GET();
    const body = await res.text();
    expect((body.match(/<item>/g) ?? []).length).toBe(0);
  });
});

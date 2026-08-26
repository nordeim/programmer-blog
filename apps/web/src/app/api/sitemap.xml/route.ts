/**
 * apps/web/src/app/api/sitemap.xml/route.ts — FR-24.
 *
 * GET /sitemap.xml — returns a valid sitemap.xml containing:
 *   - the landing page (/)
 *   - /archive
 *   - /snippets
 *   - /posts/<slug> for every published post
 *
 * Sitemap spec: https://www.sitemaps.org/protocol.html
 *
 * Per PAD §3.3 Pattern 4 (cached public route).
 */
import 'server-only';

import { getArchivePosts } from '@devlog/db';

import { env } from '@/lib/env';
import { listSnippets } from '@/lib/snippets';

export const dynamic = 'force-static';
export const revalidate = 3600;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod?: Date | string | null, changefreq = 'weekly', priority = '0.7'): string {
  const parts = ['  <url>', `    <loc>${xmlEscape(loc)}</loc>`];
  if (lastmod) {
    const d = lastmod instanceof Date ? lastmod : new Date(lastmod);
    if (!Number.isNaN(d.getTime())) {
      parts.push(`    <lastmod>${d.toISOString().split('T')[0]}</lastmod>`);
    }
  }
  parts.push(`    <changefreq>${changefreq}</changefreq>`, `    <priority>${priority}</priority>`, '  </url>');
  return parts.join('\n');
}

export async function GET() {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const [posts, snippets] = await Promise.all([
    getArchivePosts(1, 1000), // all published posts
    listSnippets(),
  ]);

  const now = new Date();
  const urls: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urlEntry(`${siteUrl}/`, now, 'weekly', '1.0'),
    urlEntry(`${siteUrl}/archive`, now, 'weekly', '0.9'),
    urlEntry(`${siteUrl}/snippets`, now, 'weekly', '0.8'),
  ];

  for (const p of posts) {
    urls.push(urlEntry(`${siteUrl}/posts/${p.slug}`, p.publishedAt, 'monthly', '0.7'));
  }
  for (const s of snippets) {
    urls.push(urlEntry(`${siteUrl}/snippets/${s.slug}`, now, 'monthly', '0.6'));
  }
  urls.push('</urlset>');

  const xml = urls.join('\n');
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

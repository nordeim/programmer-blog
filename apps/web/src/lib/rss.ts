/**
 * apps/web/src/lib/rss.ts — RSS 2.0 XML helpers (PAD §3.3 Pattern 5).
 *
 * Pure functions: take typed post data, return escaped XML strings.
 * Trivially unit-testable. The route handler at
 * `app/api/rss.xml/route.ts` calls `buildRssXml(...)` and wraps it in
 * a `Response` with the right content type.
 *
 * Reference: RSS 2.0 spec https://www.rssboard.org/rss-specification
 */
import type { Post, SiteSettings } from '@devlog/db';

import { formatRfc822Date } from '@/lib/blog';

export interface RssItem {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date | number | null;
  authorName: string;
}

export interface RssChannel {
  title: string;
  description: string;
  siteUrl: string;
  authorName: string;
  authorEmail: string;
}

/**
 * Escape a string for safe inclusion in RSS XML. Replaces &, <, >, ",
 * and ' with their entity references.
 */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a single `<item>` element. Plain-text body (the excerpt) is
 * used as `<description>`; the canonical URL is constructed from
 * the site URL.
 */
export function buildRssItem(channel: RssChannel, post: RssItem): string {
  const url = `${channel.siteUrl}/posts/${post.slug}`;
  return [
    '    <item>',
    `      <title>${xmlEscape(post.title)}</title>`,
    `      <link>${xmlEscape(url)}</link>`,
    `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
    `      <description>${xmlEscape(post.excerpt)}</description>`,
    `      <dc:creator>${xmlEscape(post.authorName)}</dc:creator>`,
    `      <pubDate>${formatRfc822Date(post.publishedAt)}</pubDate>`,
    '    </item>',
  ].join('\n');
}

/**
 * Build the complete RSS 2.0 XML document for a list of posts.
 */
export function buildRssXml(channel: RssChannel, posts: RssItem[]): string {
  const items = posts.map((p) => buildRssItem(channel, p)).join('\n');
  const lastBuild = formatRfc822Date(new Date());
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xmlEscape(channel.title)}</title>`,
    `    <link>${xmlEscape(channel.siteUrl)}</link>`,
    `    <description>${xmlEscape(channel.description)}</description>`,
    `    <lastBuildDate>${lastBuild}</lastBuildDate>`,
    `    <language>en-us</language>`,
    `    <managingEditor>${xmlEscape(channel.authorEmail)} (${xmlEscape(channel.authorName)})</managingEditor>`,
    `    <webMaster>${xmlEscape(channel.authorEmail)} (${xmlEscape(channel.authorName)})</webMaster>`,
    `    <atom:link href="${xmlEscape(channel.siteUrl)}/rss.xml" rel="self" type="application/rss+xml" />`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/**
 * Convenience mapper: turn `Post` rows + the author name into the
 * shape `buildRssXml` expects. Exported so callers can compose it
 * without re-implementing the projection.
 */
export function postToRssItem(
  post: Pick<Post, 'slug' | 'title' | 'excerpt' | 'publishedAt'>,
  authorName: string,
): RssItem {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    authorName,
  };
}

export function channelFromSettings(
  settings: SiteSettings | undefined | null,
  siteUrl: string,
  authorEmail: string,
): RssChannel {
  return {
    title: '/dev/log',
    description:
      settings?.defaultSeoDescription ??
      "Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am.",
    siteUrl,
    authorName: settings?.authorName ?? 'Alex Rivera',
    authorEmail,
  };
}

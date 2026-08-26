/**
 * apps/web/src/app/api/rss.xml/route.ts — FR-23.
 *
 * GET /rss.xml — returns RSS 2.0 XML of the 20 most recent published
 * posts. Uses the `getPostsForRss` query and the `buildRssXml` helper.
 *
 * Content-Type is set both here and in `next.config.ts` (the latter
 * applies static headers at the edge — belt-and-braces for CDNs that
 * strip the runtime header).
 *
 * Per PAD §3.3 Pattern 4 (cached public route).
 */
import 'server-only';

import { getAuthor, getPostsForRss, getSiteSettings } from '@devlog/db';

import { env } from '@/lib/env';
import { channelFromSettings, postToRssItem, buildRssXml } from '@/lib/rss';

export const dynamic = 'force-static';
export const revalidate = 3600; // 1 hour

export async function GET() {
  // Wrap in try/catch so the build (which prerenders this route) doesn't
  // fail when the DB isn't migrated yet. At runtime, a missing DB will
  // produce an empty RSS feed (just the channel metadata).
  let posts: { slug: string; title: string; excerpt: string; publishedAt: Date | null; authorId: string }[] = [];
  let settings: Awaited<ReturnType<typeof getSiteSettings>> = undefined;
  let author: Awaited<ReturnType<typeof getAuthor>> = undefined;
  try {
    [posts, settings, author] = await Promise.all([
      getPostsForRss(20),
      getSiteSettings(),
      getAuthor(),
    ]);
  } catch (e) {
    console.warn('[rss] DB unavailable, generating minimal feed', e);
  }

  const channel = channelFromSettings(
    settings,
    env.NEXT_PUBLIC_SITE_URL,
    env.NEXT_PUBLIC_AUTHOR_EMAIL,
  );

  const items = posts.map((p) =>
    postToRssItem(
      {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
      },
      author?.name ?? settings?.authorName ?? channel.authorName,
    ),
  );

  const xml = buildRssXml(channel, items);
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

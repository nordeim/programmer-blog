/**
 * apps/web/src/app/(public)/posts/[slug]/opengraph-image.tsx — post OG
 * image (R-14).
 *
 * Next.js file convention: served at /posts/<slug>/opengraph-image.
 * Renders the post title + reading time on the /dev/log brand card via
 * the centralized renderer (src/components/og-image.tsx).
 */
import { getPostBySlug } from '@devlog/db';

import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/components/og-image';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/;

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export async function generateAlt({ params }: { params: Promise<{ slug: string }> }): Promise<string> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return '/dev/log — post';
  try {
    const post = await getPostBySlug(slug);
    if (!post || post.status !== 'published') return '/dev/log — post';
    return `${post.title} — /dev/log`;
  } catch {
    return '/dev/log — post';
  }
}

export default async function PostOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let title = '/dev/log';
  let readingMinutes: number | undefined;
  try {
    const post = await getPostBySlug(slug);
    if (post && post.status === 'published') {
      title = post.title;
      readingMinutes = post.readingTimeMinutes ?? undefined;
    }
  } catch {
    // DB unavailable at build time — fall back to the brand card.
  }
  return renderOgImage({
    title,
    subtitle: 'essay',
    readingMinutes,
  });
}

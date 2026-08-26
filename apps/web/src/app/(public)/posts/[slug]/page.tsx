/**
 * apps/web/src/app/(public)/posts/[slug]/page.tsx — FR-21.
 *
 * Server component. `params: Promise<{ slug: string }>`. Validates slug
 * regex. Fetches post + tags + adjacent posts + approved comments.
 * Calls `notFound()` when the post is missing or not published. Renders
 * `<PostPage>` (which calls `renderMDX`).
 *
 * Exports `generateMetadata` for SEO and `generateStaticParams` for
 * top-50 published posts (build-time SSG).
 *
 * Source: MEP §5 Phase 5 GREEN 5.2.
 */
import {
  getAdjacentPosts,
  getApprovedCommentsForPost,
  getPostBySlug,
  getSiteSettings,
  getTagsForPost,
} from '@devlog/db';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { buildArticleSchema, JsonLd } from '@/components/json-ld';
import { PostPage } from '@/features/blog/post-page';
import { env } from '@/lib/env';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/;

interface RouteParams {
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return { title: 'Not found — /dev/log' };
  const post = await getPostBySlug(slug);
  if (!post || post.status !== 'published') {
    return { title: 'Not found — /dev/log' };
  }
  const url = `${env.NEXT_PUBLIC_SITE_URL}/posts/${post.slug}`;
  return {
    title: `${post.title} — /dev/log`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.excerpt },
  };
}

export async function generateStaticParams() {
  // During build the DB may not be migrated/seeded yet. Catch any
  // error and return [] so the build succeeds; runtime requests
  // will SSR the post on demand.
  try {
    const { getArchivePosts } = await import('@devlog/db');
    const top = await getArchivePosts(1, 50);
    return top.map((p) => ({ slug: p.slug }));
  } catch (e) {
    console.warn('[posts/generateStaticParams] DB unavailable, skipping prerender', e);
    return [];
  }
}

export default async function PostRoute({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    notFound();
  }

  const post = await getPostBySlug(slug);
  if (!post || post.status !== 'published') {
    notFound();
  }

  const [tags, adjacent, comments, settings] = await Promise.all([
    getTagsForPost(post.id),
    getAdjacentPosts(slug),
    getApprovedCommentsForPost(post.id),
    getSiteSettings(),
  ]);

  // R-11 (audit remediation): Article JSON-LD for SEO per PRD §5.3.
  const postUrl = `${env.NEXT_PUBLIC_SITE_URL}/posts/${post.slug}`;
  const articleSchema = buildArticleSchema({
    headline: post.title,
    url: postUrl,
    datePublished: (post.publishedAt ?? new Date()).toISOString(),
    dateModified: post.updatedAt ? post.updatedAt.toISOString() : undefined,
    authorName: settings?.authorName ?? 'Alex Rivera',
    authorUrl: env.NEXT_PUBLIC_SITE_URL,
    image: post.coverImageUrl ?? undefined,
    description: post.excerpt,
  });

  return (
    <>
      <JsonLd data={articleSchema} />
      <PostPage
        post={{
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          contentMdx: post.contentMdx,
          publishedAt: post.publishedAt,
          readingTimeMinutes: post.readingTimeMinutes,
          coverImageUrl: post.coverImageUrl,
          updatedAt: post.updatedAt,
        }}
        tags={tags}
        prev={adjacent.previous}
        next={adjacent.next}
        comments={comments}
        settings={
          settings
            ? {
                authorName: settings.authorName,
                authorBio: settings.authorBio,
                authorAvatarUrl: settings.authorAvatarUrl,
              }
            : null
        }
      />
    </>
  );
}

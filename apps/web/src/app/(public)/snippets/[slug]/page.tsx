/**
 * apps/web/src/app/(public)/snippets/[slug]/page.tsx — FR-22.
 *
 * Renders a single snippet. Reads the MDX file from disk via
 * `getSnippetBySlug`, renders it via `renderMDX`, falls back to
 * `notFound()` when the slug doesn't match a file.
 *
 * Source: MEP §5 Phase 5 GREEN 5.3.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { env } from '@/lib/env';
import { renderMDX } from '@/lib/mdx';
import { getSnippetBySlug, listSnippets } from '@/lib/snippets';

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/;

interface RouteParams {
  slug: string;
}

export async function generateStaticParams() {
  const all = await listSnippets();
  return all.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return { title: 'Not found — /dev/log' };
  const snippet = await getSnippetBySlug(slug);
  if (!snippet) return { title: 'Not found — /dev/log' };
  return {
    title: `${snippet.title} — /dev/log`,
    description: snippet.excerpt,
    alternates: { canonical: `${env.NEXT_PUBLIC_SITE_URL}/snippets/${snippet.slug}` },
  };
}

export default async function SnippetRoute({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    notFound();
  }
  const snippet = await getSnippetBySlug(slug);
  if (!snippet) {
    notFound();
  }

  let body: React.ReactNode;
  try {
    body = await renderMDX(snippet.content);
  } catch (err) {
    console.error('[snippet-route] MDX render failed for', slug, err);
    body = (
      <pre
        className="bg-[var(--code-bg)] text-[var(--code-fg)] p-6 overflow-x-auto font-mono text-sm"
        data-testid="mdx-fallback"
      >
        {snippet.content}
      </pre>
    );
  }

  return (
    <article className="py-24 md:py-32 px-6" data-testid="snippet-page">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/snippets"
          className="hover-link font-mono text-xs"
          style={{ color: 'var(--muted)' }}
        >
          ← back to snippets
        </Link>
        <div
          className="font-mono text-xs uppercase tracking-widest mt-8 mb-4"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} snippet · /snippets/{snippet.slug}
        </div>
        <h1
          className="font-display font-black text-4xl md:text-6xl"
          style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
        >
          {snippet.title}
        </h1>
        <p className="text-base md:text-lg mt-6" style={{ color: 'var(--muted)' }}>
          {snippet.excerpt}
        </p>
        <div
          className="post-body text-base md:text-lg leading-relaxed mt-12"
          data-testid="snippet-body"
        >
          {body}
        </div>
      </div>
    </article>
  );
}

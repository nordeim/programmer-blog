/**
 * apps/web/src/features/blog/post-page.tsx — FR-21.
 *
 * Renders a single post: top meta (date + reading time + tag pill),
 * MDX body, author bio, subscribe CTA, prev/next navigation, and
 * (optionally) a comment thread.
 *
 * Server component. The MDX body is rendered by `lib/mdx.ts::renderMDX`
 * (PAD §3.3 Pattern 5). Comments are rendered by `<CommentList>`; the
 * form is `<CommentForm>` (a client component).
 *
 * On MDX parse failure, we fall back to a `<pre>` block of the raw
 * source so the page never 500s on a corrupt post body.
 */
import type { Comment, Post, SiteSettings, Tag } from '@devlog/db';
import Link from 'next/link';


import { Tag as TagPill } from '@/components/tag';
import { CommentForm } from '@/features/blog/comment-form';
import { CommentList } from '@/features/blog/comment-list';
import { formatArchiveDate, formatLongDate, formatReadTime, stripLeadingH1 } from '@/lib/blog';
import { renderMDX } from '@/lib/mdx';

interface PostPageProps {
  post: Pick<
    Post,
    | 'slug'
    | 'title'
    | 'excerpt'
    | 'contentMdx'
    | 'publishedAt'
    | 'readingTimeMinutes'
    | 'coverImageUrl'
    | 'updatedAt'
  >;
  tags: Pick<Tag, 'slug' | 'name'>[];
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  comments: Comment[];
  settings?: Pick<SiteSettings, 'authorName' | 'authorBio' | 'authorAvatarUrl'> | null;
}

export async function PostPage({
  post,
  tags,
  prev,
  next,
  comments,
  settings,
}: PostPageProps) {
  let body: React.ReactNode;
  try {
    // R-54 (L-38): the page header owns the single <h1>; a leading
    // `# …` in the MDX body would render a second one.
    body = await renderMDX(stripLeadingH1(post.contentMdx));
  } catch (err) {
    console.error('[post-page] MDX render failed for', post.slug, err);
    body = (
      <pre
        className="bg-[var(--code-bg)] text-[var(--code-fg)] p-6 overflow-x-auto font-mono text-sm"
        data-testid="mdx-fallback"
      >
        {post.contentMdx}
      </pre>
    );
  }

  const dateLabel = formatLongDate(post.publishedAt);
  const archiveDateLabel = formatArchiveDate(post.publishedAt);
  const readTime = formatReadTime(post.readingTimeMinutes);

  return (
    <article className="py-24 md:py-32 px-6" data-testid="post-page">
      <div className="max-w-3xl mx-auto">
        {/* Top meta */}
        <div className="mb-12 reveal">
          <Link href="/archive" className="hover-link font-mono text-xs" style={{ color: 'var(--muted)' }}>
            ← back to archive
          </Link>
          <div
            className="font-mono text-xs uppercase tracking-widest mt-8 mb-4"
            style={{ color: 'var(--accent)' }}
          >
            {'//'} {dateLabel} · {readTime} read
          </div>
          <h1
            className="font-display font-black text-4xl md:text-6xl"
            style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
          >
            {post.title}
          </h1>
          <p className="text-base md:text-lg mt-6" style={{ color: 'var(--muted)' }}>
            {post.excerpt}
          </p>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-6">
              {tags.map((t) => (
                <TagPill key={t.slug}>{t.name}</TagPill>
              ))}
            </div>
          ) : null}
        </div>

        {/* MDX body */}
        <div className="post-body text-base md:text-lg leading-relaxed" data-testid="post-body">
          {body}
        </div>

        {/* Author bio + subscribe CTA */}
        <aside
          className="mt-20 py-8 px-6 border border-[var(--border)]"
          style={{ background: 'var(--bg-elev)' }}
          data-testid="author-bio"
        >
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-full flex-shrink-0"
              style={{
                background: 'var(--accent)',
                display: settings?.authorAvatarUrl ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--bg)',
                fontWeight: 700,
              }}
            >
              {(settings?.authorName ?? 'AR')
                .split(' ')
                .map((p) => p[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-display text-xl" style={{ fontWeight: 700 }}>
                {settings?.authorName ?? 'Alex Rivera'}
              </div>
              <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                {settings?.authorBio ?? 'Software engineer writing about the craft.'}
              </p>
              <Link href="/#about" className="hover-link font-mono text-xs mt-3 inline-block">
                subscribe to the dispatch →
              </Link>
            </div>
          </div>
        </aside>

        {/* Prev / Next */}
        {(prev || next) && (
          <nav
            className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6"
            aria-label="More essays"
            data-testid="prev-next"
          >
            {prev ? (
              <Link
                href={`/posts/${prev.slug}`}
                className="prev-next-card block py-6 px-6 border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                rel="prev"
              >
                <div
                  className="font-mono text-xs uppercase tracking-widest"
                  style={{ color: 'var(--muted)' }}
                >
                  ← previous
                </div>
                <div className="font-display text-lg mt-2" style={{ fontWeight: 700 }}>
                  {prev.title}
                </div>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/posts/${next.slug}`}
                className="prev-next-card block py-6 px-6 border border-[var(--border)] hover:border-[var(--accent)] transition-colors text-right"
                rel="next"
              >
                <div
                  className="font-mono text-xs uppercase tracking-widest"
                  style={{ color: 'var(--muted)' }}
                >
                  next →
                </div>
                <div className="font-display text-lg mt-2" style={{ fontWeight: 700 }}>
                  {next.title}
                </div>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {/* Comments */}
        <section className="mt-20" aria-label="Comments" data-testid="comments-section">
          <h2
            className="font-display text-2xl mb-6"
            style={{ fontWeight: 700 }}
          >
            Comments
          </h2>
          <CommentList comments={comments} />
          <CommentForm postId={post.slug} />
        </section>

        <footer
          className="mt-16 font-mono text-xs"
          style={{ color: 'var(--muted)' }}
          data-testid="post-footer"
        >
          published {archiveDateLabel} · last updated {formatArchiveDate(post.updatedAt)}
        </footer>
      </div>
    </article>
  );
}

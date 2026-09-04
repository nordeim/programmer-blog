/**
 * apps/web/src/app/(public)/archive/page.tsx — FR-20.
 *
 * Server component. Reads `?page`, `?tag`, `?q` from `searchParams`
 * (Next.js 16: `searchParams: Promise<{...}>`). Fetches paginated posts
 * via `getArchivePosts(page, pageSize, tagSlug, query)`. Renders the
 * `<TagFilter>` form, `<ArchiveList>`, and `<Pagination>` pager.
 *
 * Source: PAD §3.2 (public route group); MEP §5 Phase 5 RED 5.1.
 */
import { getArchiveCount, getArchivePosts, getTagsForPosts, getTagsInUse } from '@devlog/db';
import type { Metadata } from 'next';

import { ArchiveList } from '@/features/blog/archive-list';
import { Pagination } from '@/features/blog/pagination';
import { TagFilter } from '@/features/blog/tag-filter';
import { postToArchiveItem } from '@/lib/blog';
import { paginate } from '@/lib/pagination';

export const metadata: Metadata = {
  title: 'Archive — /dev/log',
  description: 'Every essay, sorted by recency. Filter by tag or grep by query.',
  // R-78 (Pass 7, M-52): without this the page inherits the root layout's
  // `canonical: '/'` and crawlers treat the archive as a homepage duplicate.
  alternates: { canonical: '/archive' },
};

const PAGE_SIZE = 10;

interface ArchiveSearchParams {
  page?: string;
  tag?: string;
  q?: string;
}

function parsePage(raw: string | undefined): number {
  if (!raw) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<ArchiveSearchParams>;
}) {
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const tagSlug = sp.tag?.trim() || undefined;
  const query = sp.q?.trim() || undefined;

  const [postRows, total, tagsInUse] = await Promise.all([
    getArchivePosts(page, PAGE_SIZE, tagSlug, query),
    getArchiveCount(tagSlug, query),
    // R-50 (H-38): offer only tags attached to published posts — getAllTags()
    // listed every `tags` row, so the dropdown advertised dead filters
    // (?tag=rust → "0 essays" live).
    getTagsInUse(),
  ]);

  // R-51 (M-40): real tags per row. The hardcoded `[]` below rendered every
  // archive row as "Uncategorised"; one batched IN query groups the tags
  // for the whole page (no N+1).
  const tagsByPostId = await getTagsForPosts(postRows.map((p) => p.id));

  const posts = postRows.map((p) =>
    postToArchiveItem(
      {
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
        readingTimeMinutes: p.readingTimeMinutes,
      },
      tagsByPostId.get(p.id) ?? [],
    ),
  );

  const pager = paginate({
    currentPage: page,
    totalItems: total,
    pageSize: PAGE_SIZE,
  });

  const tagOptions = tagsInUse.map((t) => ({ slug: t.slug, name: t.name }));

  return (
    <section className="py-24 md:py-32 px-6" id="archive-page" aria-labelledby="archive-title">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16">
          <div
            className="font-mono text-xs uppercase tracking-widest mb-4"
            style={{ color: 'var(--accent)' }}
          >
            {'//'} the archive
          </div>
          <h1
            id="archive-title"
            className="font-display font-black text-5xl md:text-7xl"
            style={{ letterSpacing: '-0.035em', lineHeight: 1 }}
          >
            All <span style={{ fontStyle: 'italic', fontWeight: 400 }}>essays</span>
          </h1>
          <p className="text-base mt-6 max-w-xl" style={{ color: 'var(--muted)' }}>
            {total} essay{total === 1 ? '' : 's'} on programming, written over four years. Filter by
            tag or grep the archive for a phrase.
          </p>
        </div>

        <TagFilter
          tags={tagOptions}
          currentTag={tagSlug ?? ''}
          currentQuery={query ?? ''}
          basePath="/archive"
        />

        <ArchiveList
          posts={posts}
          emptyMessage={
            tagSlug || query
              ? 'no essays match this filter. try clearing the tag or query.'
              : 'no essays published yet. check back soon.'
          }
        />

        <Pagination pager={pager} basePath="/archive" searchParams={{ tag: sp.tag, q: sp.q }} />

        <div
          className="mt-16 font-mono text-xs"
          style={{ color: 'var(--muted)' }}
          data-testid="archive-meta"
        >
          showing {pager.from}–{pager.to} of {total}
        </div>
      </div>
    </section>
  );
}

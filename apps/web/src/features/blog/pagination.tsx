/**
 * apps/web/src/features/blog/pagination.tsx — FR-20.
 *
 * Prev / Page-N / Next pager for the `/archive` and `/archive/page/[page]`
 * routes. Pure server component: takes a `PaginationResult` and a
 * `basePath` + the original `searchParams` (so tag/query are preserved
 * across page links).
 *
 * Hides itself when there is only one page. Hides Prev on page 1 and
 * Next on the last page. All anchors use plain `<a>` so the pager is
 * crawlable.
 */
import Link from 'next/link';

import type { PaginationResult } from '@/lib/pagination';
import { buildPageHref } from '@/lib/pagination';

interface PaginationProps {
  pager: PaginationResult;
  basePath: string;
  searchParams?: Record<string, string | string[] | undefined>;
}

export function Pagination({ pager, basePath, searchParams = {} }: PaginationProps) {
  if (!pager.hasMultiple) return null;

  const prevHref = pager.prev !== null ? buildPageHref(basePath, searchParams, pager.prev) : null;
  const nextHref = pager.next !== null ? buildPageHref(basePath, searchParams, pager.next) : null;

  return (
    <nav
      className="pagination mt-12 flex items-center justify-center gap-2 font-mono text-sm"
      aria-label="Pagination"
      data-testid="pagination"
    >
      {prevHref !== null ? (
        <Link
          href={prevHref}
          className="pagination-link pagination-prev"
          aria-label="Previous page"
          rel="prev"
        >
          ← prev
        </Link>
      ) : (
        <span
          className="pagination-link pagination-prev is-disabled"
          aria-disabled="true"
          style={{ opacity: 0.35 }}
        >
          ← prev
        </span>
      )}

      {pager.pages.map((p, i) =>
        p === -1 ? (
          <span
            key={`ellipsis-${i}`}
            className="pagination-ellipsis"
            aria-hidden="true"
            style={{ color: 'var(--muted)' }}
          >
            …
          </span>
        ) : (
          <Link
            key={`page-${p}`}
            href={buildPageHref(basePath, searchParams, p)}
            className={`pagination-link pagination-page${p === pager.currentPage ? ' is-current' : ''}`}
            aria-current={p === pager.currentPage ? 'page' : undefined}
          >
            {p}
          </Link>
        ),
      )}

      {nextHref !== null ? (
        <Link
          href={nextHref}
          className="pagination-link pagination-next"
          aria-label="Next page"
          rel="next"
        >
          next →
        </Link>
      ) : (
        <span
          className="pagination-link pagination-next is-disabled"
          aria-disabled="true"
          style={{ opacity: 0.35 }}
        >
          next →
        </span>
      )}
    </nav>
  );
}

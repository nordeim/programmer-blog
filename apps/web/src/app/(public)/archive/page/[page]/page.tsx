/**
 * apps/web/src/app/(public)/archive/page/[page]/page.tsx — FR-20.
 *
 * Alternative URL form for SEO: `/archive/page/2` is equivalent to
 * `/archive?page=2`. Renders the same `<ArchivePage>` UI but with the
 * page number taken from the route params instead of `searchParams`.
 *
 * We re-use the underlying logic by importing the canonical page's
 * default export and shimming a `searchParams` Promise that injects
 * the page from `params`.
 *
 * Source: MEP §5 Phase 5 #2.
 */
import type { Metadata } from 'next';

import ArchivePage from '../../page';

export const metadata: Metadata = {
  title: 'Archive — /dev/log',
  description: 'Every essay, sorted by recency. Filter by tag or grep by query.',
};

interface PageRouteParams {
  page: string;
}

export default async function ArchivePagedRoute({
  params,
  searchParams,
}: {
  params: Promise<PageRouteParams>;
  searchParams: Promise<{ tag?: string; q?: string }>;
}) {
  const [{ page }, sp] = await Promise.all([params, searchParams]);
  return (
    <ArchivePage
      searchParams={Promise.resolve({ ...sp, page })}
    />
  );
}

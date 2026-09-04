/**
 * apps/web/src/features/landing/archive-preview.tsx — FR-11.
 *
 * Renders 6 archive items. Server component; falls back to mockup
 * data when the DB is empty so the landing page always has content.
 *
 * Source: landing_page_mockup.html lines 884-966.
 */
import Link from 'next/link';

import { ArchiveItem } from '@/components/archive-item';
import { MOCKUP_ARCHIVE, type ArchiveItemData } from '@/domain/archive';

interface ArchivePreviewProps {
  items?: ArchiveItemData[];
  totalEssays?: number;
}

export function ArchivePreview({
  items,
  totalEssays = 142,
}: ArchivePreviewProps) {
  const data = items && items.length > 0 ? items : MOCKUP_ARCHIVE;
  return (
    <section className="py-24 md:py-32 px-6" id="archive">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16 reveal">
          <div
            className="font-mono text-xs uppercase tracking-widest mb-4"
            style={{ color: 'var(--accent)' }}
          >
            {'//'} the archive
          </div>
          <h2
            className="font-display font-black text-5xl md:text-7xl"
            style={{ letterSpacing: '-0.035em', lineHeight: 1 }}
          >
            Older <span style={{ fontStyle: 'italic', fontWeight: 400 }}>posts</span>
          </h2>
          <p className="text-base mt-6 max-w-xl" style={{ color: 'var(--muted)' }}>
            {totalEssays} essays on programming, written over four years.
            Filtered here by recency — the full index lives in the JSON.
          </p>
        </div>

        <div className="reveal">
          {data.map((item) => (
            <ArchiveItem
              key={`archive-${item.slug}`}
              date={item.date}
              title={item.title}
              excerpt={item.excerpt}
              tag={item.tag}
              readTime={item.readTime}
              slug={item.slug}
            />
          ))}
        </div>

        <div className="mt-12 text-center reveal">
          <Link href="/archive" className="btn-secondary">
            browse all {totalEssays} essays
            <span aria-hidden="true" className="text-xs">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

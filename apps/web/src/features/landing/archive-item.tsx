/**
 * apps/web/src/features/landing/archive-item.tsx — FR-11.
 *
 * The `.archive-item` row. Renders the date, title, excerpt, tag,
 * and read time in a single horizontal row that wraps on mobile.
 *
 * Source: landing_page_mockup.html lines 898-956.
 */
import Link from 'next/link';

interface ArchiveItemProps {
  date: string;
  title: string;
  excerpt: string;
  tag: string;
  readTime: string;
  slug: string;
}

export function ArchiveItem({ date, title, excerpt, tag, readTime, slug }: ArchiveItemProps) {
  return (
    <Link href={`/posts/${slug}`} className="archive-item">
      <div
        className="font-mono text-xs w-24 flex-shrink-0"
        style={{ color: 'var(--muted)' }}
      >
        {date}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-display text-xl md:text-2xl archive-title mb-1"
          style={{ fontWeight: 700 }}
        >
          {title}
        </div>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>
          {excerpt}
        </div>
      </div>
      <div className="tag hidden md:inline-block">{tag}</div>
      <div
        className="font-mono text-xs w-16 text-right flex-shrink-0"
        style={{ color: 'var(--muted)' }}
      >
        {readTime}
      </div>
    </Link>
  );
}

/**
 * apps/web/src/features/blog/archive-list.tsx — FR-20.
 *
 * Renders the list of `<ArchiveItem>` rows for the `/archive` page.
 * Server-friendly (no client interactivity); accepts already-shaped
 * `ArchiveItemData` rows. The page is responsible for fetching.
 *
 * Empty state: a small monospace "no posts match" row, consistent with
 * the rest of the `/dev/log` aesthetic.
 */
import { ArchiveItem } from '@/components/archive-item';
import type { ArchiveItemData } from '@/domain/archive';


interface ArchiveListProps {
  posts: ArchiveItemData[];
  emptyMessage?: string;
}

export function ArchiveList({
  posts,
  emptyMessage = 'no essays match this filter yet.',
}: ArchiveListProps) {
  if (posts.length === 0) {
    return (
      <p
        className="font-mono text-sm py-12 text-center"
        style={{ color: 'var(--muted)' }}
      >
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="reveal">
      {posts.map((item) => (
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
  );
}

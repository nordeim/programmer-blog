/**
 * apps/web/src/features/landing/archive-preview.tsx — FR-11.
 *
 * Renders 6 archive items. Server component; falls back to mockup
 * data when the DB is empty so the landing page always has content.
 *
 * Source: landing_page_mockup.html lines 884-966.
 */
import Link from 'next/link';

import { ArchiveItem } from './archive-item';

export interface ArchiveItemData {
  date: string;
  title: string;
  excerpt: string;
  tag: string;
  readTime: string;
  slug: string;
}

export const MOCKUP_ARCHIVE: ArchiveItemData[] = [
  {
    date: '09.30.24',
    title: 'The Hidden Cost of Abstraction',
    excerpt: 'Every layer you add is a layer you\'ll debug. A meditation on when to stop.',
    tag: 'Architecture',
    readTime: '11 min',
    slug: 'the-hidden-cost-of-abstraction',
  },
  {
    date: '09.18.24',
    title: 'Plain Text Will Outlive Us All',
    excerpt:
      'On choosing formats that your grandchildren\'s operating system can still open.',
    tag: 'Tools',
    readTime: '5 min',
    slug: 'plain-text-will-outlive-us-all',
  },
  {
    date: '09.02.24',
    title: 'Garbage Collection, But Make It Personal',
    excerpt:
      'What tracing collectors can teach you about letting go of side projects.',
    tag: 'Memory',
    readTime: '9 min',
    slug: 'garbage-collection-but-make-it-personal',
  },
  {
    date: '08.21.24',
    title: 'A Letter to Junior Me About Imposter Syndrome',
    excerpt:
      'Eight things I wish someone had told me in my first year of writing code for money.',
    tag: 'Career',
    readTime: '7 min',
    slug: 'a-letter-to-junior-me-about-imposter-syndrome',
  },
  {
    date: '08.07.24',
    title: 'I Wrote a Database in 200 Lines of Go',
    excerpt:
      'A WAL, an LSM-tree, and a HTTP API. Surprised how far you can get on a Saturday.',
    tag: 'Systems',
    readTime: '16 min',
    slug: 'i-wrote-a-database-in-200-lines-of-go',
  },
  {
    date: '07.24.24',
    title: 'Stop Using useEffect for Everything',
    excerpt:
      'Most effects are an admission that your state model is wrong. A re-education.',
    tag: 'React',
    readTime: '6 min',
    slug: 'stop-using-useeffect-for-everything',
  },
];

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

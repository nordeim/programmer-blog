/**
 * apps/web/src/domain/archive.ts — R-63 (Pass 6, M-47).
 *
 * The shared archive-row contract + mockup fallback data. Previously
 * these lived in `features/landing/archive-preview.tsx`, which forced
 * `lib/blog.ts` (Layer 4) to import UP into `features/` (Layer 2) and
 * `features/blog/archive-list.tsx` to import another feature's internals
 * — both review-blocking under the 5-layer golden rule.
 *
 * Domain layer: pure types and data, NO IO, NO React.
 */
export interface ArchiveItemData {
  date: string;
  title: string;
  excerpt: string;
  tag: string;
  readTime: string;
  slug: string;
}

/**
 * The landing-page mockup's archive rows (landing_page_mockup.html
 * lines 884-966) — the fallback the landing page renders when the DB
 * is empty so the page always has content.
 */
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
    excerpt: 'What tracing collectors can teach you about letting go of side projects.',
    tag: 'Memory',
    readTime: '9 min',
    slug: 'garbage-collection-but-make-it-personal',
  },
  {
    date: '08.21.24',
    title: 'A Letter to Junior Me About Imposter Syndrome',
    excerpt: 'Eight things I wish someone had told me in my first year of writing code for money.',
    tag: 'Career',
    readTime: '7 min',
    slug: 'a-letter-to-junior-me-about-imposter-syndrome',
  },
  {
    date: '08.07.24',
    title: 'I Wrote a Database in 200 Lines of Go',
    excerpt: 'A WAL, an LSM-tree, and a HTTP API. Surprised how far you can get on a Saturday.',
    tag: 'Systems',
    readTime: '16 min',
    slug: 'i-wrote-a-database-in-200-lines-of-go',
  },
  {
    date: '07.24.24',
    title: 'Stop Using useEffect for Everything',
    excerpt: 'Most effects are an admission that your state model is wrong. A re-education.',
    tag: 'React',
    readTime: '6 min',
    slug: 'stop-using-useeffect-for-everything',
  },
];

/**
 * apps/web/src/lib/blog.ts — pure helpers for mapping DB rows into view
 * shapes used by the blog surface (archive list, post page, RSS).
 *
 * Pure (no server-only import) so tests can import them directly.
 */
import type { Post, Tag } from '@devlog/db';

import type { ArchiveItemData } from '@/domain/archive';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/**
 * Formats a Date (or unix-ms number) as `MM.DD.YY` — the format used
 * throughout the mockup archive list. Returns `'—'` for null/missing
 * dates (e.g. drafts).
 */
export function formatArchiveDate(d: Date | number | null | undefined): string {
  if (d === null || d === undefined) return '—';
  const date = typeof d === 'number' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const yy = String(date.getUTCFullYear()).slice(-2);
  return `${mm}.${dd}.${yy}`;
}

/**
 * Formats a reading time (integer minutes) as `N min` (e.g. `8 min`,
 * `14 min`). Clamps to `1 min` minimum.
 */
export function formatReadTime(minutes: number | null | undefined): string {
  const m = typeof minutes === 'number' && minutes > 0 ? Math.round(minutes) : 1;
  return `${m} min`;
}

/**
 * Maps a Post row + its tags into the shape `<ArchiveItem>` expects.
 * Falls back to the first tag name or `'Uncategorised'` when the post
 * has no tags.
 */
export function postToArchiveItem(
  post: Pick<
    Post,
    'slug' | 'title' | 'excerpt' | 'publishedAt' | 'readingTimeMinutes'
  >,
  tags: Pick<Tag, 'slug' | 'name'>[] = [],
): ArchiveItemData {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    date: formatArchiveDate(post.publishedAt),
    readTime: formatReadTime(post.readingTimeMinutes),
    tag: tags[0]?.name ?? 'Uncategorised',
  };
}

/**
 * Returns the post's tags as a space-separated string suitable for the
 * `<Tag>` pill row on the post page. Empty string when no tags.
 */
export function joinTagNames(tags: Pick<Tag, 'slug' | 'name'>[]): string {
  return tags.map((t) => t.name).join(' · ');
}

/**
 * R-54 (Pass 5, L-38): removes a LEADING `# …` heading from MDX content.
 *
 * The post page renders its own `<h1>{post.title}</h1>` header; seeded
 * post bodies repeated the title as a first-line `# …` heading, so the
 * page shipped two `<h1>` elements (a11y outline + SEO defect, verified
 * live). Only a heading on the very first line is stripped — headings
 * after an intro paragraph are content and stay. Returns the input
 * unchanged when there is no leading H1.
 */
export function stripLeadingH1(mdx: string): string {
  return mdx.replace(/^#[^\S\n].*\n?/, '');
}

/**
 * Returns the month-name + year label used by the post-page top meta
 * (e.g. `November 2024`). Returns `'—'` when the date is missing.
 */
export function formatLongDate(d: Date | number | null | undefined): string {
  if (d === null || d === undefined) return '—';
  const date = typeof d === 'number' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  const month = MONTHS[date.getUTCMonth()];
  if (!month) return '—';
  return `${month} ${date.getUTCFullYear()}`;
}

/**
 * RFC-822 date string for RSS `<pubDate>` elements.
 * Example: `Tue, 12 Nov 2024 00:00:00 GMT`.
 */
export function formatRfc822Date(d: Date | number | null | undefined): string {
  if (d === null || d === undefined) return new Date().toUTCString();
  const date = typeof d === 'number' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return new Date().toUTCString();
  return date.toUTCString();
}

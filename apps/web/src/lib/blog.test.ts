/**
 * apps/web/src/lib/blog.test.ts — TDD for the blog mapping helpers.
 */
import { describe, expect, it } from 'vitest';

import {
  formatArchiveDate,
  formatLongDate,
  formatReadTime,
  formatRfc822Date,
  joinTagNames,
  postToArchiveItem,
  stripLeadingH1,
} from './blog';

describe('formatArchiveDate', () => {
  it('formats a UTC date as MM.DD.YY', () => {
    const d = new Date('2024-11-12T00:00:00Z');
    expect(formatArchiveDate(d)).toBe('11.12.24');
  });

  it('formats a unix-ms number', () => {
    const d = Date.UTC(2024, 8, 21); // Sep 21 2024
    expect(formatArchiveDate(d)).toBe('09.21.24');
  });

  it('returns — for null/undefined/invalid', () => {
    expect(formatArchiveDate(null)).toBe('—');
    expect(formatArchiveDate(undefined)).toBe('—');
    expect(formatArchiveDate(new Date('invalid'))).toBe('—');
  });
});

describe('formatReadTime', () => {
  it('formats a positive integer', () => {
    expect(formatReadTime(8)).toBe('8 min');
  });

  it('rounds non-integer minutes', () => {
    expect(formatReadTime(7.4)).toBe('7 min');
    expect(formatReadTime(7.6)).toBe('8 min');
  });

  it('clamps non-positive values to 1 min', () => {
    expect(formatReadTime(0)).toBe('1 min');
    expect(formatReadTime(null)).toBe('1 min');
    expect(formatReadTime(undefined)).toBe('1 min');
    expect(formatReadTime(-5)).toBe('1 min');
  });
});

describe('postToArchiveItem', () => {
  const basePost = {
    slug: 'a-slug',
    title: 'A Title',
    excerpt: 'An excerpt.',
    publishedAt: new Date('2024-11-12T00:00:00Z'),
    readingTimeMinutes: 8,
  } as const;

  it('maps with the first tag name', () => {
    const item = postToArchiveItem(basePost, [
      { slug: 'javascript', name: 'JavaScript' },
      { slug: 'react', name: 'React' },
    ]);
    expect(item).toEqual({
      slug: 'a-slug',
      title: 'A Title',
      excerpt: 'An excerpt.',
      date: '11.12.24',
      readTime: '8 min',
      tag: 'JavaScript',
    });
  });

  it('falls back to "Uncategorised" when no tags', () => {
    const item = postToArchiveItem(basePost, []);
    expect(item.tag).toBe('Uncategorised');
  });
});

describe('joinTagNames', () => {
  it('joins tag names with " · "', () => {
    expect(
      joinTagNames([
        { slug: 'javascript', name: 'JavaScript' },
        { slug: 'rust', name: 'Rust' },
      ]),
    ).toBe('JavaScript · Rust');
  });

  it('returns empty string when no tags', () => {
    expect(joinTagNames([])).toBe('');
  });
});

describe('formatLongDate', () => {
  it('formats as "Month YYYY"', () => {
    expect(formatLongDate(new Date('2024-11-12T00:00:00Z'))).toBe('Nov 2024');
    expect(formatLongDate(Date.UTC(2024, 0, 1))).toBe('Jan 2024');
  });

  it('returns — for null/invalid', () => {
    expect(formatLongDate(null)).toBe('—');
    expect(formatLongDate(new Date('invalid'))).toBe('—');
  });
});

describe('formatRfc822Date', () => {
  it('returns a UTC string for a valid date', () => {
    const s = formatRfc822Date(new Date('2024-11-12T00:00:00Z'));
    expect(s).toMatch(/GMT$/);
    expect(s).toContain('Nov');
    expect(s).toContain('2024');
  });

  it('returns a valid UTC string for null/invalid (fallback to now)', () => {
    const s = formatRfc822Date(null);
    expect(s).toMatch(/GMT$/);
  });
});

describe('stripLeadingH1 — R-54 (L-38 double H1)', () => {
  it('strips a leading H1 line', () => {
    expect(stripLeadingH1('# My Title\n\nBody text.')).toBe('\nBody text.');
  });

  it('strips a bare leading H1', () => {
    expect(stripLeadingH1('# Title')).toBe('');
  });

  it('preserves content that does not start with an H1', () => {
    const mdx = 'Intro paragraph.\n\n# Later heading stays\n';
    expect(stripLeadingH1(mdx)).toBe(mdx);
  });

  it('does not strip H2 headings', () => {
    expect(stripLeadingH1('## Sub heading\nbody')).toBe('## Sub heading\nbody');
  });

  it('does not strip an H1 that is not the first line', () => {
    expect(stripLeadingH1('\n\n# Not leading\n')).toBe('\n\n# Not leading\n');
  });

  it('leaves empty/whitespace content untouched', () => {
    expect(stripLeadingH1('')).toBe('');
  });
});

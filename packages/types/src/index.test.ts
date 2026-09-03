/**
 * packages/types/src/index.test.ts — shared Zod schemas + helpers (R-18).
 *
 * RED first: the submodules (post/subscriber/comment/user/env) don't
 * exist yet. Mirrors MEP Phase 2 file #17-23 and the audit remediation
 * R-18 / R-24.
 */
import { describe, expect, it } from 'vitest';

import {
  calculateReadTime,
  commentStatusSchema,
  createCommentInputSchema,
  postInputSchema,
  postStatusSchema,
  slugify,
  subscribeInputSchema,
  subscriberPreferencesSchema,
  subscriberStatusSchema,
  userRoleSchema,
} from './index';

describe('slugify (R-18)', () => {
  it('slugifies a natural title into kebab-case', () => {
    expect(slugify('On the Quiet Violence of Implicit Conversions')).toBe(
      'on-the-quiet-violence-of-implicit-conversions',
    );
  });

  it('strips punctuation and collapses runs of dashes (underscore is stripped, matching the admin action)', () => {
    expect(slugify('What?!  The `foo` -- bar baz...')).toBe('what-the-foo-bar-baz');
    // Underscore is not a letter/number/space/dash, so it is removed
    // (same as the original slugifyTitle in admin/actions.ts).
    expect(slugify('bar_baz')).toBe('barbaz');
  });

  it('caps the slug at 80 chars with no leading/trailing dash', () => {
    const long = slugify('a'.repeat(200));
    expect(long.length).toBeLessThanOrEqual(80);
    expect(long).toMatch(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);
  });

  it('returns an empty string for a title with no usable characters', () => {
    expect(slugify('!!!???')).toBe('');
  });
});

describe('calculateReadTime (R-18, R-24 — markdown-aware)', () => {
  it('counts 200 words per minute with Math.round, min 1', () => {
    expect(calculateReadTime('word '.repeat(400))).toBe(2);
    expect(calculateReadTime('word '.repeat(201))).toBe(1); // Math.round(1.005) = 1
    expect(calculateReadTime('word '.repeat(300))).toBe(2); // 1.5 rounds to 2
    expect(calculateReadTime('word '.repeat(1))).toBe(1);
    expect(calculateReadTime('')).toBe(1);
  });

  it('strips markdown syntax before counting (R-24)', () => {
    const md = '# Heading\n\n```js\nconst x = 1; // fenced code\n```\n\nSome body text.';
    // Only prose words count: "Some body text." = 3 words → 1 min.
    expect(calculateReadTime(md)).toBe(1);
  });

  it('ignores fenced code blocks and inline code entirely', () => {
    const codeHeavy = '```\n' + 'word '.repeat(1000) + '\n```\n\nword word';
    expect(calculateReadTime(codeHeavy)).toBe(1);
  });
});

describe('postInputSchema (R-18)', () => {
  const valid = {
    title: 'On the Quiet Violence of Implicit Conversions',
    slug: 'on-the-quiet-violence-of-implicit-conversions',
    excerpt: 'Type coercion is a feature until it is a trap.',
    contentMdx: '# hi\n\nbody',
  };

  it('accepts a valid post input and defaults status to draft', () => {
    const parsed = postInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.status).toBe('draft');
  });

  it('rejects an invalid slug', () => {
    const parsed = postInputSchema.safeParse({ ...valid, slug: 'Not_A_Valid Slug!' });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown status', () => {
    const parsed = postInputSchema.safeParse({ ...valid, status: 'bogus' });
    expect(parsed.success).toBe(false);
  });

  it('accepts tagSlugs and publishedAt as optional extras', () => {
    const parsed = postInputSchema.safeParse({
      ...valid,
      status: 'published',
      publishedAt: '2026-08-26T00:00:00.000Z',
      tagSlugs: ['typescript', 'debugging'],
    });
    expect(parsed.success).toBe(true);
  });
});

describe('postStatusSchema (R-18)', () => {
  it('accepts the three lifecycle statuses', () => {
    for (const s of ['draft', 'published', 'archived'] as const) {
      expect(postStatusSchema.safeParse(s).success).toBe(true);
    }
    expect(postStatusSchema.safeParse('other').success).toBe(false);
  });
});

describe('subscribeInputSchema (R-18)', () => {
  it('accepts a valid email', () => {
    expect(subscribeInputSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
  });
  it('rejects a malformed email', () => {
    expect(subscribeInputSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});

describe('subscriber enums (R-18)', () => {
  it('subscriberStatusSchema accepts the four statuses', () => {
    for (const s of ['pending', 'confirmed', 'unsubscribed', 'bounced'] as const) {
      expect(subscriberStatusSchema.safeParse(s).success).toBe(true);
    }
  });
  it('preferences schema accepts weekly/monthly', () => {
    expect(subscriberPreferencesSchema.safeParse({ frequency: 'weekly' }).success).toBe(true);
    expect(subscriberPreferencesSchema.safeParse({ frequency: 'daily' }).success).toBe(false);
  });
});

describe('createCommentInputSchema (R-18)', () => {
  it('accepts a minimal anonymous comment', () => {
    const parsed = createCommentInputSchema.safeParse({
      postId: 'post-1',
      body: 'nice post',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.authorName).toBe('anonymous');
  });

  it('rejects a too-short body', () => {
    expect(
      createCommentInputSchema.safeParse({ postId: 'post-1', body: 'hi' }).success,
    ).toBe(false);
  });

  it('rejects a missing postId', () => {
    expect(createCommentInputSchema.safeParse({ body: 'nice post' }).success).toBe(false);
  });
});

describe('commentStatusSchema / userRoleSchema (R-18)', () => {
  it('comment statuses match the db enum', () => {
    for (const s of ['pending', 'approved', 'spam', 'deleted'] as const) {
      expect(commentStatusSchema.safeParse(s).success).toBe(true);
    }
  });
  it('user roles match the db enum', () => {
    expect(userRoleSchema.safeParse('author').success).toBe(true);
    expect(userRoleSchema.safeParse('subscriber').success).toBe(true);
    expect(userRoleSchema.safeParse('admin').success).toBe(false);
  });
});

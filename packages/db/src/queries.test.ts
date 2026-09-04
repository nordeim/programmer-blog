/**
 * packages/db/src/queries.test.ts — R-32 (Pass 3) integration tests.
 *
 * First real-database coverage for the query layer (previously zero —
 * which is exactly how the two production-breaking bugs shipped):
 *
 *   C-32: `count(*)::int` is PostgreSQL-only syntax; SQLite raises
 *         `SqliteError: unrecognized token: ":"`. Affects getArchiveCount
 *         (both branches), getConfirmedSubscriberCount, getSubscriberStats,
 *         getPostStats, getCommentStats → /archive + /admin 500s.
 *
 *   C-33: getAdjacentPosts bound a JS `Date` into the raw SQL predicate —
 *         better-sqlite3 refuses: "SQLite3 can only bind numbers, strings,
 *         bigints, buffers, and null" → /posts/[slug] 500s.
 *
 * Strategy: temp SQLite file (DATABASE_PATH), run the committed drizzle
 * migrations, insert a small fixture, and assert real query results.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The client reads DATABASE_PATH lazily on first query — set it before any
// db access happens (migrations in beforeAll are the first touch).
const tmpDir = mkdtempSync(join(tmpdir(), 'devlog-queries-'));
process.env.DATABASE_PATH = join(tmpDir, 'test.db');

import { db } from './client';
import { runMigrations } from './migrate';
import {
  getAdjacentPosts,
  getArchiveCount,
  getArchivePosts,
  getPostsByIds,
  getCommentStats,
  getConfirmedSubscriberCount,
  getPostStats,
  getSubscriberStats,
  getTagsForPosts,
  getTagsInUse,
  searchPosts,
} from './queries';
import { posts, postsToTags, subscribers, tags, users, comments } from './schema';

// Fixture timestamps: A(2024-01-01) < B(2024-02-01) < C(2024-03-01)
const T = {
  a: new Date(Date.UTC(2024, 0, 1)),
  b: new Date(Date.UTC(2024, 1, 1)),
  c: new Date(Date.UTC(2024, 2, 1)),
};

beforeAll(() => {
  runMigrations();

  db.insert(users)
    .values({ id: 'u1', email: 'author@test.dev', role: 'author', name: 'Alex' })
    .run();

  db.insert(posts)
    .values([
      { id: 'pa', slug: 'post-a', title: 'A', excerpt: 'a', contentMdx: '# a', authorId: 'u1', status: 'published', publishedAt: T.a },
      { id: 'pb', slug: 'post-b', title: 'B', excerpt: 'b', contentMdx: '# b', authorId: 'u1', status: 'published', publishedAt: T.b },
      { id: 'pc', slug: 'post-c', title: 'C', excerpt: 'c', contentMdx: '# c', authorId: 'u1', status: 'published', publishedAt: T.c },
      { id: 'pd', slug: 'draft-d', title: 'D', excerpt: 'd', contentMdx: '# d', authorId: 'u1', status: 'draft', publishedAt: null },
    ])
    .run();

  db.insert(tags)
    .values([
      { id: 't1', slug: 'rust', name: 'Rust' },
      { id: 't2', slug: 'unused-tag', name: 'Unused Tag' },
    ])
    .run();
  db.insert(postsToTags)
    .values({ postId: 'pc', tagId: 't1' })
    .run();

  db.insert(subscribers)
    .values([
      { id: 's1', email: 'confirmed@test.dev', status: 'confirmed' },
      { id: 's2', email: 'pending@test.dev', status: 'pending' },
    ])
    .run();

  db.insert(comments)
    .values([
      { id: 'cm1', postId: 'pa', authorName: 'ann', authorEmail: 'ann@test.dev', body: 'nice', status: 'approved' },
      { id: 'cm2', postId: 'pa', authorName: 'bob', authorEmail: 'bob@test.dev', body: 'spam', status: 'pending' },
    ])
    .run();
});

afterAll(() => {
  // Close the underlying better-sqlite3 handle via a fresh query proxy pass.
  // (The singleton stays for the process lifetime; vitest exits anyway.)
});

describe('getPostsByIds — R-86 (Pass 7, L-49)', () => {
  it('returns only the requested posts, keyed lookups intact', async () => {
    const rows = await getPostsByIds(['pa', 'pc']);
    expect(rows.map((r) => r.slug).sort()).toEqual(['post-a', 'post-c']);
  });

  it('returns [] for an empty id list (no unbounded query)', async () => {
    expect(await getPostsByIds([])).toEqual([]);
  });
});

describe('posts_to_tags unique constraint — R-82 (Pass 7, L-45)', () => {
  it('rejects a duplicate (postId, tagId) row at the schema level', () => {
    // pc + t1 already associated in the fixture — a second insert must
    // throw instead of silently double-counting in tag listings.
    expect(() =>
      db.insert(postsToTags).values({ postId: 'pc', tagId: 't1' }).run(),
    ).toThrow();
  });
});

describe('query guards — R-85 (Pass 7, L-48)', () => {
  it('clamps pageSize <= 0 to 1 so LIMIT never becomes unbounded (-1)', async () => {
    // 3 published posts in the fixture; a negative pageSize pre-guard
    // flowed into drizzle LIMIT -1 — which SQLite treats as "no limit" —
    // returning the whole table.
    expect((await getArchivePosts(1, -5)).length).toBe(1);
    expect((await getArchivePosts(1, 0)).length).toBe(1);
  });

  it('getAdjacentPosts returns nulls for a post with a null publishedAt', async () => {
    // draft-d ships with publishedAt = null; pre-guard, its ts resolved
    // to 0 and "next" incorrectly resolved to the oldest published post.
    expect(await getAdjacentPosts('draft-d')).toEqual({ previous: null, next: null });
  });
});

describe('getArchiveCount — C-32 ::int regression', () => {
  it('counts published posts without throwing (SQLite has no :: casts)', async () => {
    await expect(getArchiveCount()).resolves.toBe(3);
  });

  it('counts posts filtered by tag slug via the join branch', async () => {
    await expect(getArchiveCount('rust')).resolves.toBe(1);
  });

  it('combines tag + free-text query filters', async () => {
    await expect(getArchiveCount('rust', 'zzz-no-match')).resolves.toBe(0);
  });
});

describe('getAdjacentPosts — C-33 Date-binding regression', () => {
  it('returns previous/newer neighbours for the middle post', async () => {
    const adj = await getAdjacentPosts('post-b');
    expect(adj.previous?.slug).toBe('post-a');
    expect(adj.next?.slug).toBe('post-c');
  });

  it('returns null neighbours for the oldest post (previous side empty)', async () => {
    const adj = await getAdjacentPosts('post-a');
    expect(adj.previous).toBeNull();
    expect(adj.next?.slug).toBe('post-b');
  });

  it('returns {null, null} for an unknown slug', async () => {
    await expect(getAdjacentPosts('nope')).resolves.toEqual({
      previous: null,
      next: null,
    });
  });
});

describe('stats helpers — H-33 ::int regression', () => {
  it('getPostStats returns numeric counts per status', async () => {
    await expect(getPostStats()).resolves.toEqual({
      draft: 1,
      published: 3,
      archived: 0,
    });
  });

  it('getSubscriberStats returns numeric counts per status', async () => {
    await expect(getSubscriberStats()).resolves.toMatchObject({
      confirmed: 1,
      pending: 1,
    });
  });

  it('getConfirmedSubscriberCount returns a number', async () => {
    await expect(getConfirmedSubscriberCount()).resolves.toBe(1);
  });

  it('getCommentStats returns numeric counts per status', async () => {
    await expect(getCommentStats()).resolves.toMatchObject({
      approved: 1,
      pending: 1,
    });
  });
});

describe('getArchivePosts — paginated listing stays correct', () => {
  it('returns published posts newest-first with pagination', async () => {
    const rows = await getArchivePosts(1, 2);
    expect(rows.map((r) => r.slug)).toEqual(['post-c', 'post-b']);
  });

  it('filters by tag via the join branch', async () => {
    const rows = await getArchivePosts(1, 10, 'rust');
    expect(rows.map((r) => r.slug)).toEqual(['post-c']);
  });
});

describe('getTagsInUse — R-50 (H-38 dead tag filters)', () => {
  it('returns only tags attached to at least one published post', async () => {
    const rows = await getTagsInUse();
    // 'unused-tag' has no postsToTags row; it must NOT be offered.
    expect(rows.map((t) => t.slug)).toEqual(['rust']);
  });

  it('excludes tags only attached to draft posts', async () => {
    // Attach t2 to the DRAFT post only — still must not be "in use".
    db.insert(postsToTags).values({ postId: 'pd', tagId: 't2' }).run();
    const rows = await getTagsInUse();
    expect(rows.map((t) => t.slug)).toEqual(['rust']);
  });
});

describe('getTagsForPosts — R-51 (M-40 Uncategorised archive rows)', () => {
  it('groups tags per post id in a single batched query', async () => {
    const map = await getTagsForPosts(['pc', 'pb']);
    expect(map.get('pc')?.map((t) => t.name)).toEqual(['Rust']);
    expect(map.get('pb')).toEqual([]);
  });

  it('returns an empty map for an empty id list (no query)', async () => {
    await expect(getTagsForPosts([])).resolves.toEqual(new Map());
  });

  it('returns [] for unknown post ids', async () => {
    const map = await getTagsForPosts(['nope']);
    expect(map.get('nope')).toEqual([]);
  });
});

describe('postEpochSeconds — R-32 helper unit tests', () => {
  it('converts Date to epoch seconds (floored)', async () => {
    const { postEpochSeconds } = await import('./queries');
    expect(postEpochSeconds(new Date(Date.UTC(2024, 0, 1, 0, 0, 1, 500)))).toBe(
      Math.floor(Date.UTC(2024, 0, 1, 0, 0, 1, 500) / 1000),
    );
  });

  it('passes through numbers and treats null/undefined as 0', async () => {
    const { postEpochSeconds } = await import('./queries');
    expect(postEpochSeconds(1704067200)).toBe(1704067200);
    expect(postEpochSeconds(null)).toBe(0);
    expect(postEpochSeconds(undefined)).toBe(0);
  });
});

// R-66 (audit L-41): user-supplied `%`/`_` must be matched LITERALLY
// (drizzle `like` has no ESCAPE clause by default, so a bare `%query%`
// pattern let `%%` match every row), and the result set is bounded.
describe('searchPosts — R-66 (L-41 wildcard escape + LIMIT)', () => {
  it('treats % and _ as literal characters, not wildcards', async () => {
    // A bare `%` used to match every published post.
    expect((await searchPosts('%')).length).toBe(0);
    expect((await searchPosts('_')).length).toBe(0);
    // An ordinary substring still matches (fixture: title 'A', excerpt 'a').
    expect((await searchPosts('a')).length).toBe(1);
    expect((await searchPosts('post-a')).length).toBe(0); // slug is not searched
  });

  it('caps the result set at 50 rows', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      id: `plimit-${i}`,
      slug: `limit-probe-${i}`,
      title: 'limit probe',
      excerpt: 'x',
      contentMdx: '# x',
      authorId: 'u1',
      status: 'published' as const,
      publishedAt: T.a,
    }));
    db.insert(posts).values(many).run();
    expect((await searchPosts('limit probe')).length).toBe(50);
  });
});

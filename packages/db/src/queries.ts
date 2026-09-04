/**
 * @devlog/db/queries — reusable Drizzle query functions.
 * Each is a thin wrapper returning typed results. Server-side only.
 *
 * R-32 (Pass 3): this layer now has real-SQLite integration coverage
 * (queries.test.ts) after two production-breaking bugs shipped here
 * unobserved: PostgreSQL-only `count(*)::int` casts (SQLite raises
 * `unrecognized token: ":"`) and a JS `Date` bound into raw SQL
 * (better-sqlite3 refuses non-numeric binds). Rules of the road:
 *   - use drizzle's portable `count()` helper, never `::` casts;
 *   - raw `sql` fragments against timestamp columns must bind epoch
 *     SECONDS (the stored unit), via `postEpochSeconds` below.
 */
import { and, count, desc, eq, inArray, isNotNull, isNull, like, or, sql } from 'drizzle-orm';

import { db } from './client';
import { comments, posts, postsToTags, siteSettings, subscribers, tags, users } from './schema';

/**
 * R-32: normalize a timestamp value to the unit SQLite stores (epoch
 * seconds) so it can be safely bound into a raw `sql` predicate.
 * Drizzle's `{ mode: 'timestamp' }` columns read back as `Date` objects,
 * and better-sqlite3 rejects `Date` binds.
 */
export function postEpochSeconds(value: Date | number | null | undefined): number {
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === 'number') return Math.floor(value);
  return 0;
}

// ── Posts ──────────────────────────────────────────────────────────────────
export async function getRecentPosts(limit = 3) {
  return db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .all();
}

export async function getPostBySlug(slug: string) {
  return db.select().from(posts).where(eq(posts.slug, slug)).limit(1).get();
}

/**
 * Phase 5 refactor: archive listing with proper tag filtering and search.
 *
 * - `tagSlug` filters by joining posts_to_tags + tags (case-insensitive
 *   tag slug match).
 * - `query` is a substring LIKE match against title and excerpt.
 * - Both filters compose via AND.
 * - Returns full Post rows; the caller maps them into ArchiveItemData.
 *
 * Returns `[]` on empty DB; never throws on empty filter inputs.
 */
export async function getArchivePosts(
  page = 1,
  pageSize = 10,
  tagSlug?: string,
  query?: string,
) {
  const offset = Math.max(0, (page - 1) * pageSize);
  const conditions: ReturnType<typeof eq>[] = [eq(posts.status, 'published')];
  if (query && query.trim().length > 0) {
    const pattern = `%${query.trim()}%`;
    const orClause = or(like(posts.title, pattern), like(posts.excerpt, pattern));
    if (orClause) conditions.push(orClause);
  }

  if (tagSlug && tagSlug.trim().length > 0) {
    const rows = db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        excerpt: posts.excerpt,
        contentMdx: posts.contentMdx,
        coverImageUrl: posts.coverImageUrl,
        publishedAt: posts.publishedAt,
        updatedAt: posts.updatedAt,
        readingTimeMinutes: posts.readingTimeMinutes,
        authorId: posts.authorId,
        status: posts.status,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .innerJoin(postsToTags, eq(postsToTags.postId, posts.id))
      .innerJoin(tags, eq(tags.id, postsToTags.tagId))
      .where(and(eq(tags.slug, tagSlug.toLowerCase()), ...conditions))
      .orderBy(desc(posts.publishedAt))
      .limit(pageSize)
      .offset(offset)
      .all();
    return rows;
  }

  return db
    .select()
    .from(posts)
    .where(and(...conditions))
    .orderBy(desc(posts.publishedAt))
    .limit(pageSize)
    .offset(offset)
    .all();
}

export async function getArchiveCount(tagSlug?: string, query?: string) {
  const conditions: ReturnType<typeof eq>[] = [eq(posts.status, 'published')];
  if (query && query.trim().length > 0) {
    const pattern = `%${query.trim()}%`;
    const orClause = or(like(posts.title, pattern), like(posts.excerpt, pattern));
    if (orClause) conditions.push(orClause);
  }

  if (tagSlug && tagSlug.trim().length > 0) {
    const result = db
      .select({ count: count() })
      .from(posts)
      .innerJoin(postsToTags, eq(postsToTags.postId, posts.id))
      .innerJoin(tags, eq(tags.id, postsToTags.tagId))
      .where(and(eq(tags.slug, tagSlug.toLowerCase()), ...conditions))
      .get();
    return result?.count ?? 0;
  }

  const result = db
    .select({ count: count() })
    .from(posts)
    .where(and(...conditions))
    .get();
  return result?.count ?? 0;
}

/**
 * Returns the previous and next published posts around `slug`,
 * ordered by `publishedAt` descending. Used by the post page
 * to render prev/next navigation. Either or both may be `null`.
 */
export async function getAdjacentPosts(slug: string) {
  const current = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1).get();
  if (!current) return { previous: null, next: null };

  // R-32 (C-33): bind epoch SECONDS, not a Date object — better-sqlite3
  // rejects Date binds and 500s every post page.
  const currentTs = postEpochSeconds(current.publishedAt);

  const next =
    db
      .select({ slug: posts.slug, title: posts.title })
      .from(posts)
      .where(
        and(
          eq(posts.status, 'published'),
          isNotNull(posts.publishedAt),
          sql`${posts.publishedAt} > ${currentTs}`,
        ),
      )
      .orderBy(posts.publishedAt)
      .limit(1)
      .get() ?? null;

  const previous =
    db
      .select({ slug: posts.slug, title: posts.title })
      .from(posts)
      .where(
        and(
          eq(posts.status, 'published'),
          isNotNull(posts.publishedAt),
          sql`${posts.publishedAt} < ${currentTs}`,
          sql`${posts.slug} != ${slug}`,
        ),
      )
      .orderBy(desc(posts.publishedAt))
      .limit(1)
      .get() ?? null;

  return { previous, next };
}

/**
 * Returns the tags associated with a given post (by id), as
 * `{ slug, name }`. Empty array if the post has no tags or
 * doesn't exist.
 */
export async function getTagsForPost(postId: string) {
  return db
    .select({ slug: tags.slug, name: tags.name })
    .from(tags)
    .innerJoin(postsToTags, eq(postsToTags.tagId, tags.id))
    .where(eq(postsToTags.postId, postId))
    .orderBy(tags.name)
    .all();
}

export async function getAllPosts() {
  return db.select().from(posts).orderBy(desc(posts.createdAt)).all();
}

export async function getPostsForRss(limit = 20) {
  return db
    .select({
      slug: posts.slug,
      title: posts.title,
      excerpt: posts.excerpt,
      publishedAt: posts.publishedAt,
      authorId: posts.authorId,
    })
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))
    .limit(limit)
    .all();
}

// ── Subscribers ─────────────────────────────────────────────────────────────
export async function getSubscriberByEmail(email: string) {
  return db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1).get();
}

export async function getSubscriberByToken(token: string, kind: 'confirm' | 'unsubscribe') {
  const col = kind === 'confirm' ? subscribers.confirmToken : subscribers.unsubscribeToken;
  return db.select().from(subscribers).where(eq(col, token)).limit(1).get();
}

export async function getConfirmedSubscriberCount() {
  const result = db
    .select({ count: count() })
    .from(subscribers)
    .where(eq(subscribers.status, 'confirmed'))
    .get();
  return result?.count ?? 0;
}

export async function getSubscribersByStatus(status: typeof subscribers.status.enumValues[number]) {
  return db.select().from(subscribers).where(eq(subscribers.status, status)).all();
}

// ── Comments ────────────────────────────────────────────────────────────────
export async function getPendingComments() {
  return db.select().from(comments).where(eq(comments.status, 'pending')).all();
}

export async function getApprovedCommentsForPost(postId: string) {
  return db
    .select()
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.status, 'approved')))
    .orderBy(desc(comments.createdAt))
    .all();
}

// ── Tags ────────────────────────────────────────────────────────────────────
export async function getAllTags() {
  return db.select().from(tags).orderBy(tags.name).all();
}

/**
 * R-50 (Pass 5, H-38): tags attached to at least one PUBLISHED post.
 *
 * `getAllTags()` returns every row in the `tags` table, so the archive
 * filter dropdown offered slugs that no published post carries (e.g.
 * `?tag=rust` → "0 essays" on the live deployment) — dead filters that
 * look broken to visitors. `inArray`-style DISTINCT join keeps this to
 * a single query.
 */
export async function getTagsInUse() {
  const rows = db
    .selectDistinct({ id: tags.id, slug: tags.slug, name: tags.name })
    .from(tags)
    .innerJoin(postsToTags, eq(postsToTags.tagId, tags.id))
    .innerJoin(posts, eq(posts.id, postsToTags.postId))
    .where(eq(posts.status, 'published'))
    .orderBy(tags.name)
    .all();
  return rows;
}

/**
 * R-51 (Pass 5, M-40): batched tags-per-post lookup for list views.
 *
 * The archive page passed a hardcoded `[]` into `postToArchiveItem`,
 * so every row rendered as "Uncategorised". One `inArray` query groups
 * the tags for a whole page of posts (no N+1).
 */
export async function getTagsForPosts(postIds: string[]) {
  const map = new Map<string, { id: string; slug: string; name: string }[]>();
  for (const id of postIds) map.set(id, []);
  if (postIds.length === 0) return map;

  const rows = db
    .select({
      postId: postsToTags.postId,
      id: tags.id,
      slug: tags.slug,
      name: tags.name,
    })
    .from(postsToTags)
    .innerJoin(tags, eq(tags.id, postsToTags.tagId))
    .where(inArray(postsToTags.postId, postIds))
    .all();

  for (const row of rows) {
    map.get(row.postId)?.push({ id: row.id, slug: row.slug, name: row.name });
  }
  return map;
}

// ── Site settings ───────────────────────────────────────────────────────────
export async function getSiteSettings() {
  return db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1).get();
}

// ── Users ────────────────────────────────────────────────────────────────────
export async function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).limit(1).get();
}

export async function getAuthor() {
  // The single author of /dev/log. Seeded in Phase 2.
  return db.select().from(users).where(eq(users.role, 'author')).limit(1).get();
}

// ── Newsletter stats (for admin dashboard) ──────────────────────────────────
export async function getSubscriberStats() {
  const rows = db
    .select({ status: subscribers.status, count: count() })
    .from(subscribers)
    .groupBy(subscribers.status)
    .all();
  return {
    pending: rows.find((r) => r.status === 'pending')?.count ?? 0,
    confirmed: rows.find((r) => r.status === 'confirmed')?.count ?? 0,
    unsubscribed: rows.find((r) => r.status === 'unsubscribed')?.count ?? 0,
    bounced: rows.find((r) => r.status === 'bounced')?.count ?? 0,
  };
}

export async function getPostStats() {
  const rows = db
    .select({ status: posts.status, count: count() })
    .from(posts)
    .groupBy(posts.status)
    .all();
  return {
    draft: rows.find((r) => r.status === 'draft')?.count ?? 0,
    published: rows.find((r) => r.status === 'published')?.count ?? 0,
    archived: rows.find((r) => r.status === 'archived')?.count ?? 0,
  };
}

export async function getCommentStats() {
  const rows = db
    .select({ status: comments.status, count: count() })
    .from(comments)
    .groupBy(comments.status)
    .all();
  return {
    pending: rows.find((r) => r.status === 'pending')?.count ?? 0,
    approved: rows.find((r) => r.status === 'approved')?.count ?? 0,
    spam: rows.find((r) => r.status === 'spam')?.count ?? 0,
    deleted: rows.find((r) => r.status === 'deleted')?.count ?? 0,
  };
}

// ── Search (LIKE-based for v1) ──────────────────────────────────────────────
export async function searchPosts(query: string) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.status, 'published'),
        or(like(posts.title, pattern), like(posts.excerpt, pattern)),
      ),
    )
    .orderBy(desc(posts.publishedAt))
    .all();
}

// Re-export non-async helpers for callers that need them.
export { and, desc, eq, isNotNull, isNull };

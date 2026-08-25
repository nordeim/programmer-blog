/**
 * @devlog/db/queries — reusable Drizzle query functions.
 * Each is a thin wrapper returning typed results. Server-side only.
 */
import { and, desc, eq, isNotNull, isNull, like, or, sql } from 'drizzle-orm';
import { db } from './client';
import { comments, posts, postsToTags, siteSettings, subscribers, tags, users } from './schema';

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

export async function getArchivePosts(page = 1, pageSize = 10, tagFilter?: string) {
  const offset = (page - 1) * pageSize;
  let query = db
    .select()
    .from(posts)
    .where(eq(posts.status, 'published'))
    .orderBy(desc(posts.publishedAt))
    .limit(pageSize)
    .offset(offset);
  if (tagFilter) {
    // For Phase 1, we don't apply the tag filter at SQL level — return all
    // and filter in JS. Phase 5 of MEP refactors this to use postsToTags join.
    void tagFilter;
  }
  return query.all();
}

export async function getArchiveCount() {
  const result = db
    .select({ count: sql<number>`count(*)::int` })
    .from(posts)
    .where(eq(posts.status, 'published'))
    .get();
  return result?.count ?? 0;
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
    .select({ count: sql<number>`count(*)::int` })
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
    .select({ status: subscribers.status, count: sql<number>`count(*)::int` })
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
    .select({ status: posts.status, count: sql<number>`count(*)::int` })
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
    .select({ status: comments.status, count: sql<number>`count(*)::int` })
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

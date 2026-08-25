/**
 * @devlog/db — full Drizzle schema for /dev/log.
 *
 * Implements PAD §4.1 (Database Schema). All tables use sqliteTable.
 * Foreign keys via `references(() => X.id, { onDelete: 'cascade' })`.
 *
 * Invariants enforced at the application layer:
 *  - posts.slug is unique and lowercase ASCII-folded.
 *  - (posts.status, posts.publishedAt) pair: if 'published', publishedAt IS NOT NULL;
 *    if 'draft', publishedAt IS NULL. Drizzle + SQLite don't easily express this
 *    as a CHECK constraint, so the application validates it on insert.
 *  - subscribers.confirm_token and subscribers.unsubscribe_token are unique.
 *  - site_settings is a single row (id = 1); the application enforces "no second row".
 */
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ── users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image_url'),
  name: text('name'),
  passwordHash: text('password_hash'),
  role: text('role', { enum: ['author', 'subscriber'] }).notNull().default('subscriber'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── sessions (Better Auth) ──────────────────────────────────────────────────
export const sessions = sqliteTable('sessions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

// ── posts ───────────────────────────────────────────────────────────────────
export const posts = sqliteTable(
  'posts',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt').notNull(),
    contentMdx: text('content_mdx').notNull(),
    coverImageUrl: text('cover_image_url'),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    readingTimeMinutes: integer('reading_time_minutes').notNull().default(1),
    authorId: text('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['draft', 'published', 'archived'] })
      .notNull()
      .default('draft'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index('posts_status_published_at_idx').on(table.status, table.publishedAt),
    index('posts_slug_idx').on(table.slug),
  ],
);

// ── tags ────────────────────────────────────────────────────────────────────
export const tags = sqliteTable('tags', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── posts_to_tags (join table) ───────────────────────────────────────────────
export const postsToTags = sqliteTable(
  'posts_to_tags',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [index('posts_to_tags_post_idx').on(table.postId), index('posts_to_tags_tag_idx').on(table.tagId)],
);

// ── subscribers (newsletter) ─────────────────────────────────────────────────
export const subscribers = sqliteTable(
  'subscribers',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull().unique(),
    status: text('status', { enum: ['pending', 'confirmed', 'unsubscribed', 'bounced'] })
      .notNull()
      .default('pending'),
    confirmToken: text('confirm_token').unique(),
    unsubscribeToken: text('unsubscribe_token').unique(),
    preferences: text('preferences', { mode: 'json' }).$type<{ frequency: 'weekly' | 'monthly' }>(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    confirmedAt: integer('confirmed_at', { mode: 'timestamp' }),
    unsubscribedAt: integer('unsubscribed_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('subscribers_status_idx').on(table.status),
    index('subscribers_email_idx').on(table.email),
  ],
);

// ── comments (on posts) ────────────────────────────────────────────────────
export const comments = sqliteTable(
  'comments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'), // self-reference; null = top-level
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),
    body: text('body').notNull(), // plain text only — no HTML
    status: text('status', { enum: ['pending', 'approved', 'spam', 'deleted'] })
      .notNull()
      .default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [index('comments_post_status_idx').on(table.postId, table.status)],
);

// ── site_settings (single row, id = 1) ───────────────────────────────────────
export const siteSettings = sqliteTable('site_settings', {
  id: integer('id').primaryKey().default(1),
  authorName: text('author_name').notNull().default('Alex Rivera'),
  authorBio: text('author_bio').notNull().default('Software engineer writing about the craft.'),
  authorAvatarUrl: text('author_avatar_url'),
  socialLinks: text('social_links', { mode: 'json' }).$type<{
    github?: string;
    twitter?: string;
    rss?: string;
    email?: string;
  }>(),
  defaultSeoDescription: text('default_seo_description').notNull(),
  // Default value supplied by the seed script (avoids SQL-escaping issues
  // with apostrophes in the migration).
  defaultOgImageUrl: text('default_og_image_url'),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ── Re-exports for type inference ────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;

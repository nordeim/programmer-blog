/**
 * apps/web/src/features/admin/actions.ts — FR-41, FR-43, FR-44.
 *
 * Server Actions: createPost, updatePost, deletePost, moderateComment,
 * updateSiteSettings. All require `role: 'author'`.
 *
 * Each action:
 *   1. Reads the session cookie from next/headers.
 *   2. Calls requireAuthor(cookie) — throws AuthorRequiredError on miss.
 *   3. Validates input via Zod.
 *   4. Performs the DB write.
 *   5. Returns a typed result the form can react to.
 *
 * Per PAD §3.3 Pattern 3 (server action) + Pattern 6 (rate limit).
 */
'use server';

import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { isAuthorRequiredError, requireAuthor } from '@/lib/auth';
import { db, schema } from '@/lib/db';

const MAX_TITLE = 200;
const MAX_EXCERPT = 500;
const MAX_CONTENT = 100_000;

export const postInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(MAX_TITLE),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/, 'Slug must be lowercase kebab-case.'),
  excerpt: z.string().trim().min(1, 'Excerpt is required.').max(MAX_EXCERPT),
  contentMdx: z.string().trim().min(1, 'Content is required.').max(MAX_CONTENT),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  publishedAt: z.string().optional(),
  tagSlugs: z.array(z.string()).optional(),
});
export type PostInput = z.infer<typeof postInputSchema>;

export interface AdminSuccess {
  ok: true;
  message: string;
}

export interface AdminFailure {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export type AdminResult = AdminSuccess | AdminFailure;

function fail(error: string, fieldErrors?: Record<string, string>): AdminFailure {
  return { ok: false, error, fieldErrors };
}

function ok(message: string): AdminSuccess {
  return { ok: true, message };
}

async function requireAuthorFromCookie() {
  const jar = await cookies();
  const cookie = jar.get('devlog_session')?.value;
  return requireAuthor(cookie);
}

function computeReadingTime(content: string): number {
  // 200 words per minute, per industry convention.
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function createPost(input: unknown): Promise<AdminResult & { postId?: string }> {
  let authorId: string;
  try {
    const user = await requireAuthorFromCookie();
    authorId = user.id;
  } catch (e) {
    if (isAuthorRequiredError(e)) return fail('You must be signed in as an author.');
    throw e;
  }

  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail('Invalid input.', fieldErrors);
  }
  const data = parsed.data;
  const slug = data.slug || slugifyTitle(data.title);
  if (!slug) return fail('Slug is required.', { slug: 'Slug is required.' });

  try {
    // Uniqueness check.
    const existing = db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.slug, slug))
      .limit(1)
      .get();
    if (existing) {
      return fail('A post with that slug already exists.', { slug: 'Slug already taken.' });
    }

    const now = new Date();
    const publishedAt =
      data.status === 'published' && data.publishedAt ? new Date(data.publishedAt) : data.status === 'published' ? now : null;

    const result = db
      .insert(schema.posts)
      .values({
        slug,
        title: data.title,
        excerpt: data.excerpt,
        contentMdx: data.contentMdx,
        status: data.status,
        publishedAt,
        readingTimeMinutes: computeReadingTime(data.contentMdx),
        authorId,
      })
      .returning({ id: schema.posts.id })
      .get();
    if (!result) return fail('Unable to create post.');

    // Attach tags.
    if (data.tagSlugs && data.tagSlugs.length > 0) {
      const tagRows = db
        .select({ id: schema.tags.id, slug: schema.tags.slug })
        .from(schema.tags)
        .all();
      const slugToId = new Map(tagRows.map((t) => [t.slug, t.id]));
      for (const slugT of data.tagSlugs) {
        const tagId = slugToId.get(slugT);
        if (tagId) {
          db.insert(schema.postsToTags)
            .values({ postId: result.id, tagId })
            .run();
        }
      }
    }

    return { ok: true, message: 'Post created.', postId: result.id };
  } catch (e) {
    console.error('[createPost] DB error', e);
    return fail('Server error.');
  }
}

export async function updatePost(
  postId: string,
  input: unknown,
): Promise<AdminResult> {
  try {
    await requireAuthorFromCookie();
  } catch (e) {
    if (isAuthorRequiredError(e)) return fail('You must be signed in as an author.');
    throw e;
  }

  const parsed = postInputSchema.partial().safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail('Invalid input.', fieldErrors);
  }
  const data = parsed.data;

  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title) updates.title = data.title;
    if (data.slug) updates.slug = data.slug;
    if (data.excerpt) updates.excerpt = data.excerpt;
    if (data.contentMdx) {
      updates.contentMdx = data.contentMdx;
      updates.readingTimeMinutes = computeReadingTime(data.contentMdx);
    }
    if (data.status) {
      updates.status = data.status;
      if (data.status === 'published' && !data.publishedAt) {
        // Preserve existing publishedAt if present, else now.
        const existing = db
          .select({ publishedAt: schema.posts.publishedAt })
          .from(schema.posts)
          .where(eq(schema.posts.id, postId))
          .limit(1)
          .get();
        updates.publishedAt = existing?.publishedAt ?? new Date();
      }
    }
    if (data.publishedAt) updates.publishedAt = new Date(data.publishedAt);

    db.update(schema.posts).set(updates).where(eq(schema.posts.id, postId)).run();

    if (data.tagSlugs) {
      // Replace tag associations.
      db.delete(schema.postsToTags).where(eq(schema.postsToTags.postId, postId)).run();
      const tagRows = db.select({ id: schema.tags.id, slug: schema.tags.slug }).from(schema.tags).all();
      const slugToId = new Map(tagRows.map((t) => [t.slug, t.id]));
      for (const slugT of data.tagSlugs) {
        const tagId = slugToId.get(slugT);
        if (tagId) {
          db.insert(schema.postsToTags).values({ postId, tagId }).run();
        }
      }
    }

    return ok('Post updated.');
  } catch (e) {
    console.error('[updatePost] DB error', e);
    return fail('Server error.');
  }
}

export async function deletePost(postId: string): Promise<AdminResult> {
  try {
    await requireAuthorFromCookie();
  } catch (e) {
    if (isAuthorRequiredError(e)) return fail('You must be signed in as an author.');
    throw e;
  }
  try {
    db.delete(schema.posts).where(eq(schema.posts.id, postId)).run();
    return ok('Post deleted.');
  } catch (e) {
    console.error('[deletePost] DB error', e);
    return fail('Server error.');
  }
}

export const moderateCommentInputSchema = z.object({
  commentId: z.string().min(1),
  action: z.enum(['approve', 'spam', 'delete']),
});
export type ModerateCommentInput = z.infer<typeof moderateCommentInputSchema>;

export async function moderateComment(input: unknown): Promise<AdminResult> {
  try {
    await requireAuthorFromCookie();
  } catch (e) {
    if (isAuthorRequiredError(e)) return fail('You must be signed in as an author.');
    throw e;
  }
  const parsed = moderateCommentInputSchema.safeParse(input);
  if (!parsed.success) return fail('Invalid input.');
  const { commentId, action } = parsed.data;
  try {
    const status =
      action === 'approve' ? 'approved' : action === 'spam' ? 'spam' : 'deleted';
    db.update(schema.comments)
      .set({ status })
      .where(eq(schema.comments.id, commentId))
      .run();
    return ok(`Comment ${action}d.`);
  } catch (e) {
    console.error('[moderateComment] DB error', e);
    return fail('Server error.');
  }
}

export const siteSettingsInputSchema = z.object({
  authorName: z.string().trim().min(1).max(100),
  authorBio: z.string().trim().min(1).max(500),
  authorAvatarUrl: z.string().url().optional().or(z.literal('')),
  defaultSeoDescription: z.string().trim().min(1).max(300),
  defaultOgImageUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  rssUrl: z.string().url().optional().or(z.literal('')),
  emailUrl: z.string().email().optional().or(z.literal('')),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;

export async function updateSiteSettings(input: unknown): Promise<AdminResult> {
  try {
    await requireAuthorFromCookie();
  } catch (e) {
    if (isAuthorRequiredError(e)) return fail('You must be signed in as an author.');
    throw e;
  }
  const parsed = siteSettingsInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_';
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fail('Invalid input.', fieldErrors);
  }
  const data = parsed.data;
  try {
    const socialLinks: Record<string, string> = {};
    if (data.githubUrl) socialLinks.github = data.githubUrl;
    if (data.twitterUrl) socialLinks.twitter = data.twitterUrl;
    if (data.rssUrl) socialLinks.rss = data.rssUrl;
    if (data.emailUrl) socialLinks.email = data.emailUrl;

    db.update(schema.siteSettings)
      .set({
        authorName: data.authorName,
        authorBio: data.authorBio,
        authorAvatarUrl: data.authorAvatarUrl || null,
        defaultSeoDescription: data.defaultSeoDescription,
        defaultOgImageUrl: data.defaultOgImageUrl || null,
        socialLinks,
        updatedAt: new Date(),
      })
      .where(eq(schema.siteSettings.id, 1))
      .run();
    return ok('Settings saved.');
  } catch (e) {
    console.error('[updateSiteSettings] DB error', e);
    return fail('Server error.');
  }
}

void sql;
void and;

/**
 * apps/web/src/features/blog/actions.ts — FR-60, MEP §5 #13.
 *
 * Server Action `createComment({ postId, body, parentId? })`.
 * Validates input, applies an in-memory rate limit (per-IP), inserts
 * a `pending` comment row. Returns either a success marker or an
 * error object the form can surface to the user.
 *
 * Auth model (Phase 5): allows anonymous comments (with a hashed
 * email + name field). Phase 6 of the MEP hardens this to require a
 * subscriber session and replaces anonymous comments with subscriber
 * data. The schema field names are kept stable so the Phase 6
 * migration is mechanical.
 *
 * Per PAD §3.3 Pattern 6 (rate limit) + Pattern 3 (server action).
 */
'use server';

import 'server-only';

import { createCommentInputSchema } from '@devlog/types';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';

import { db, schema } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIpFromHeaders } from '@/lib/request-ip';

const COMMENT_RATE_LIMIT_PER_HOUR = 10;

export type CreateCommentInput = import('@devlog/types').CreateCommentInput;

export interface CreateCommentSuccess {
  ok: true;
  commentId: string;
  message: string;
}

export interface CreateCommentFailure {
  ok: false;
  error: string;
  fieldErrors?: Partial<Record<keyof CreateCommentInput, string>>;
}

export type CreateCommentResult = CreateCommentSuccess | CreateCommentFailure;

export async function createComment(
  input: unknown,
  ctx: { ip?: string } = {},
): Promise<CreateCommentResult> {
  const parsed = createCommentInputSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false,
      error: firstIssue?.message ?? 'Invalid comment.',
      fieldErrors: {
        body: parsed.error.issues.find((i) => i.path[0] === 'body')?.message,
        postId: parsed.error.issues.find((i) => i.path[0] === 'postId')?.message,
      },
    };
  }
  const { postId, body, parentId, authorName, authorEmail } = parsed.data;

  // R-40 (H-35): rate limit by the REAL client IP, read server-side from
  // proxy headers. The previous key (`comment:${postId}` when no IP was
  // passed by the caller) put every visitor of a post into ONE shared
  // 10/hour bucket — the 11th legitimate commenter was locked out for
  // everyone. Falls back to postId only when no proxy headers exist
  // (e.g. tests, or a direct connection with no proxy in front).
  let clientIp = ctx.ip;
  if (!clientIp) {
    const headersList = await headers();
    clientIp = getClientIpFromHeaders(headersList);
  }
  const rateKey = clientIp === 'unknown' ? `comment:unknown-${postId}` : `comment:${clientIp}`;
  const allowed = await rateLimit(rateKey, COMMENT_RATE_LIMIT_PER_HOUR, 3600);
  if (!allowed) {
    return { ok: false, error: 'Too many comments. Try again later.' };
  }

  try {
    // Verify the post exists and is published — comments are disabled on drafts.
    const postRow = db
      .select({ id: schema.posts.id, status: schema.posts.status })
      .from(schema.posts)
      .where(and(eq(schema.posts.id, postId), eq(schema.posts.status, 'published')))
      .limit(1)
      .get();

    // Some callers pass a slug instead of an id (the public comment form
    // doesn't know the UUID). Fall back to a slug lookup.
    let resolvedPostId = postId;
    if (!postRow) {
      const bySlug = db
        .select({ id: schema.posts.id, status: schema.posts.status })
        .from(schema.posts)
        .where(and(eq(schema.posts.slug, postId), eq(schema.posts.status, 'published')))
        .limit(1)
        .get();
      if (!bySlug) {
        return { ok: false, error: 'Post not found or comments closed.' };
      }
      resolvedPostId = bySlug.id;
    } else {
      resolvedPostId = postRow.id;
    }

    // Validate parentId (must belong to the same post).
    if (parentId) {
      const parent = db
        .select({ id: schema.comments.id, postId: schema.comments.postId })
        .from(schema.comments)
        .where(and(eq(schema.comments.id, parentId), eq(schema.comments.postId, resolvedPostId)))
        .limit(1)
        .get();
      if (!parent) {
        return { ok: false, error: 'Parent comment not found.' };
      }
    }

    const result = db
      .insert(schema.comments)
      .values({
        postId: resolvedPostId,
        parentId: parentId ?? null,
        authorName,
        authorEmail: authorEmail ?? 'anonymous@devlog.example',
        body,
        status: 'pending',
      })
      .returning({ id: schema.comments.id })
      .get();

    if (!result) {
      return { ok: false, error: 'Unable to save comment.' };
    }

    return {
      ok: true,
      commentId: result.id,
      message: 'Thanks. Your comment is in the moderation queue.',
    };
  } catch (e) {
    console.error('[createComment] DB error', e);
    return { ok: false, error: 'Server error. Please try again later.' };
  }
}

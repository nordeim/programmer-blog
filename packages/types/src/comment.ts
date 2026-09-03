/**
 * packages/types/src/comment.ts — comment schemas (R-18, MEP #19).
 *
 * Mirrors apps/web/src/features/blog/actions.ts `createCommentInputSchema`
 * and the db `comments` table status enum.
 */
import { z } from 'zod';

export const MIN_BODY_LENGTH = 3;
export const MAX_BODY_LENGTH = 2000;
export const MAX_AUTHOR_NAME = 80;

export const commentStatusSchema = z.enum(['pending', 'approved', 'spam', 'deleted']);
export type CommentStatus = z.infer<typeof commentStatusSchema>;

export const createCommentInputSchema = z.object({
  postId: z.string().min(1, 'postId is required.'),
  body: z
    .string()
    .trim()
    .min(MIN_BODY_LENGTH, `Comment must be at least ${MIN_BODY_LENGTH} characters.`)
    .max(MAX_BODY_LENGTH, `Comment must be at most ${MAX_BODY_LENGTH} characters.`),
  parentId: z.string().optional(),
  authorName: z.string().trim().min(1).max(MAX_AUTHOR_NAME).optional().default('anonymous'),
  authorEmail: z.string().email().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

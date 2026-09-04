/**
 * apps/web/src/features/admin/schemas.ts — R-48 (Pass 5, C-37).
 *
 * Plain (non-'use server') module owning the admin Zod schemas.
 *
 * Next.js 16 forbids any non-async export from a `'use server'` file —
 * the previous home of these schemas (`features/admin/actions.ts`)
 * exported them as Zod objects, which made the Server Actions loader
 * throw `A "use server" file can only export async functions, found
 * object.` at module-evaluation time. That took every admin mutation
 * (createPost, updatePost, deletePost, moderateComment,
 * updateSiteSettings) down with a 500 the moment it was invoked in
 * production (audit C-37).
 *
 * 'use server' files may IMPORT from here freely — only their own
 * exports are restricted.
 */
import { z } from 'zod';

export const moderateCommentInputSchema = z.object({
  commentId: z.string().min(1),
  action: z.enum(['approve', 'spam', 'delete']),
});
export type ModerateCommentInput = z.infer<typeof moderateCommentInputSchema>;

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

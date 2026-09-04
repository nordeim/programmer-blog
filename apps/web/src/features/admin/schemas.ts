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

/**
 * R-65 (audit L-40): `z.string().url()` happily accepts `javascript:`,
 * `data:` and other schemes. These fields are stored as social/SEO URLs
 * — if any future render sink emits them as `href`s, a non-http(s)
 * scheme becomes stored XSS. Constrain to http(s) at the boundary.
 */
const httpUrl = () =>
  z
    .string()
    .url()
    .refine((v) => /^https?:\/\//i.test(v), 'Must be an http(s) URL');

/**
 * R-87 (Pass 7, L-50): the RSS field may be a site-relative path starting
 * with '/' — the seed ships '/rss.xml', and R-65's absolute-URL guard made
 * every settings save of that untouched seed value fail. Off-site-relative
 * paths ('../…') stay rejected; social URLs remain absolute-only.
 */
const rssUrlValue = () =>
  z
    .string()
    .refine(
      (v) => /^https?:\/\//i.test(v) || v.startsWith('/'),
      'Must be an http(s) URL or a site-relative path starting with "/".',
    );

export const moderateCommentInputSchema = z.object({
  commentId: z.string().min(1),
  action: z.enum(['approve', 'spam', 'delete']),
});
export type ModerateCommentInput = z.infer<typeof moderateCommentInputSchema>;

export const siteSettingsInputSchema = z.object({
  authorName: z.string().trim().min(1).max(100),
  authorBio: z.string().trim().min(1).max(500),
  authorAvatarUrl: httpUrl().optional().or(z.literal('')),
  defaultSeoDescription: z.string().trim().min(1).max(300),
  defaultOgImageUrl: httpUrl().optional().or(z.literal('')),
  githubUrl: httpUrl().optional().or(z.literal('')),
  twitterUrl: httpUrl().optional().or(z.literal('')),
  rssUrl: rssUrlValue().optional().or(z.literal('')),
  emailUrl: z.string().email().optional().or(z.literal('')),
});
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>;

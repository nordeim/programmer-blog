/**
 * packages/types/src/post.ts — post schemas + helpers (R-18, MEP #17).
 *
 * `postInputSchema` mirrors the constraints that were inline in
 * apps/web/src/features/admin/actions.ts (now imported from here) so the
 * admin server actions and any future writers share one source of truth.
 */
import { z } from 'zod';

export const MAX_TITLE = 200;
export const MAX_EXCERPT = 500;
export const MAX_CONTENT = 100_000;

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,80}[a-z0-9])?$/;

export const postStatusSchema = z.enum(['draft', 'published', 'archived']);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const postInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(MAX_TITLE),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(SLUG_RE, 'Slug must be lowercase kebab-case.'),
  excerpt: z.string().trim().min(1, 'Excerpt is required.').max(MAX_EXCERPT),
  contentMdx: z.string().trim().min(1, 'Content is required.').max(MAX_CONTENT),
  status: postStatusSchema.default('draft'),
  publishedAt: z.string().optional(),
  tagSlugs: z.array(z.string()).optional(),
});
export type PostInput = z.infer<typeof postInputSchema>;

/**
 * Slugify a natural-language title. Mirrors the admin action's
 * `slugifyTitle`: lowercase, strip non-alphanumerics, collapse dashes,
 * trim, cap at 80 chars.
 */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80)
      // re-trim in case slicing landed on a trailing dash
      .replace(/-$/g, '')
  );
}

/**
 * Reading time in minutes at 200 wpm (industry convention), minimum 1.
 *
 * R-24: markdown syntax is stripped before counting so headings markers,
 * fenced/inline code, links and emphasis don't inflate the estimate.
 */
export function calculateReadTime(content: string): number {
  const prose = stripMarkdown(content);
  const words = prose.trim().length === 0 ? 0 : prose.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Strip markdown syntax for word counting:
 *  - fenced code blocks (``` / ~~~) — removed entirely
 *  - inline code (`code`) — content removed
 *  - headings markers, emphasis, blockquotes, list bullets, link targets
 */
export function stripMarkdown(content: string): string {
  return content
    // fenced code blocks (open ``` or ~~~ ... until the closing fence or EOT)
    .replace(/```[\s\S]*?(```|$)/g, '')
    .replace(/~~~[\s\S]*?(~~~|$)/g, '')
    // inline code
    .replace(/`[^`\n]*`/g, '')
    // headings / setext markers / blockquotes / list bullets
    .replace(/^\s{0,3}(#{1,6})\s+/gm, '')
    .replace(/^\s{0,3}>/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+[.)]\s+/gm, '')
    // emphasis + strikethrough markers
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    // links [text](url) → text ; images ![alt](url) → removed
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // horizontal rules
    .replace(/^\s{0,3}([-*_]\s*){3,}$/gm, '');
}

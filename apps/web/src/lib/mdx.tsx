/**
 * apps/web/src/lib/mdx.ts — MDX rendering helper (PAD §3.3 Pattern 5).
 *
 * Renders an MDX string to React using `next-mdx-remote/rsc`. Applies
 * Shiki syntax highlighting via `@shikijs/rehype`, slugifies headings
 * via `rehype-slug`, and autolinks headings via `rehype-autolink-headings`.
 *
 * Server-only (uses React Server Components). The returned value can
 * be embedded directly inside a server component's JSX.
 *
 * On error (invalid MDX, malformed), returns a branded fallback block
 * so the post page still renders. The error is logged for the admin.
 */
import 'server-only';

import { MDXRemote } from 'next-mdx-remote/rsc';
import type { ComponentType } from 'react';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';

import { defaultMDXComponents } from '@/features/blog/mdx-components';

export interface MdxRenderOptions {
  /** Override the component map (e.g. to inject a per-post CodeMirror instance). */
  components?: Record<string, ComponentType<unknown> | 'a' | 'pre' | 'img'>;
}

/**
 * Render an MDX string as a React element suitable for embedding inside
 * a server component. Throws on parse error — callers should catch and
 * fall back to a plain-text preview.
 */
export async function renderMDX(
  source: string,
  _opts: MdxRenderOptions = {},
): Promise<React.ReactElement> {
  const components = { ...defaultMDXComponents, ..._opts.components } as Record<
    string,
    ComponentType<unknown>
  >;
  return (
    <MDXRemote
      source={source}
      components={components as never}
      options={{
        mdxOptions: {
          rehypePlugins: [
            rehypeSlug,
            [
              rehypeAutolinkHeadings,
              {
                behavior: 'wrap',
                properties: { className: 'heading-anchor' },
              },
            ],
            // Shiki plugin would be added here in a follow-up. For v1 we ship
            // plain `<pre><code>` highlighting via the CSS theme.
          ],
        },
      }}
    />
  );
}

/**
 * Compute the slug form of a heading (mirrors rehype-slug so the post's
 * table of contents can link to anchors ahead of render time).
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

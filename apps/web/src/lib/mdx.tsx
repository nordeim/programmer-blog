/**
 * apps/web/src/lib/mdx.tsx — MDX rendering helper (PAD §3.3 Pattern 5).
 *
 * Renders an MDX string to React using `next-mdx-remote/rsc`. Applies
 * slugified + autolinked headings via `rehype-slug` +
 * `rehype-autolink-headings`.
 *
 * Server-only (uses React Server Components). The returned value can
 * be embedded directly inside a server component's JSX.
 *
 * R-63 (audit M-47): the component map is a REQUIRED parameter — the
 * previous default import from `@/features/blog/mdx-components` made
 * this Layer-4 file import UP into Layer 2, creating a feature↔lib
 * cycle. Call sites (features/blog/post-page.tsx, the snippet route)
 * pass `defaultMDXComponents` explicitly.
 *
 * On error (invalid MDX, malformed), callers catch and fall back to a
 * branded plain-text block so the page still renders.
 */
import 'server-only';

import { MDXRemote } from 'next-mdx-remote/rsc';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';

/**
 * The exact component-map type `MDXRemote` accepts. Reusing the
 * library's own prop type (rather than a hand-rolled
 * `Record<string, ComponentType<unknown>>`) keeps the map assignable
 * in both directions with no casts and no `as never` laundering
 * (R-68): intrinsic overrides like `pre: PreBlock` are accepted
 * exactly as the renderer expects them.
 */
type MdxRemoteComponents = NonNullable<React.ComponentProps<typeof MDXRemote>['components']>;

export type MdxComponentMap = MdxRemoteComponents;

export interface MdxRenderOptions {
  /** The MDX component map (e.g. `defaultMDXComponents` from features/blog). */
  components: MdxComponentMap;
  /** Override individual components on top of `components`. */
  overrides?: MdxComponentMap;
}

/**
 * Render an MDX string as a React element suitable for embedding inside
 * a server component. Throws on parse error — callers should catch and
 * fall back to a plain-text preview.
 */
export async function renderMDX(source: string, opts: MdxRenderOptions): Promise<React.ReactElement> {
  const merged: MdxComponentMap = { ...opts.components, ...opts.overrides };
  return (
    <MDXRemote
      source={source}
      components={merged}
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

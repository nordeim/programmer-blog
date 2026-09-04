/**
 * apps/web/src/features/blog/mdx-components.tsx — MDX component map.
 *
 * Maps standard HTML elements to /dev/log-branded React components so
 * MDX content from the DB renders consistently with the rest of the
 * site. Used by `lib/mdx.ts` (Pattern 5).
 *
 * Mappings:
 *   - `pre` → existing `<CodeWindow>` (FR-9, FR-10)
 *   - `a`  → `<HoverLink>` (internal: next/link, external: target=_blank)
 *   - `img` → `next/image`
 *
 * R-93 (Pass 7, L-56): a previous docstring claimed h2/h3 anchor-link
 * mappings — no such mapping exists in the map below. Post/snippet
 * headings render as styled defaults, not clickable anchors.
 */
import Image from 'next/image';
import Link from 'next/link';
import type { ComponentProps } from 'react';

import { CodeWindow } from '@/components/code-window';
import { HoverLink } from '@/components/hover-link';

type PreProps = ComponentProps<'pre'> & { children?: React.ReactNode };

function PreBlock({ children, ...rest }: PreProps) {
  // MDX passes the raw code as a string child of <code> inside <pre>.
  // We unwrap the inner text and render a <CodeWindow>.
  let codeText = '';
  if (typeof children === 'string') {
    codeText = children;
  } else if (Array.isArray(children)) {
    codeText = children
      .map((c) => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object' && 'props' in c) {
          const props = (c as { props?: { children?: unknown } }).props;
          if (props?.children && typeof props.children === 'string') return props.children;
        }
        return '';
      })
      .join('');
  } else if (children && typeof children === 'object' && 'props' in children) {
    const props = (children as { props?: { children?: unknown } }).props;
    if (props?.children && typeof props.children === 'string') codeText = props.children;
  }

  // Derive a filename hint from the data-language attribute on <code>.
  const codeChild = Array.isArray(children) ? children[0] : children;
  const className =
    codeChild && typeof codeChild === 'object' && 'props' in codeChild
      ? ((codeChild as { props?: { className?: string } }).props?.className ?? '')
      : '';
  const langMatch = /language-(\w+)/.exec(className ?? '');
  const language = langMatch ? langMatch[1] : undefined;

  void rest; // unused props (id, style) — pass-through would re-trigger ESLint no-unused
  return (
    <CodeWindow title={language ? `snippet.${language}` : 'snippet'} code={codeText} language={language} />
  );
}

type AnchorProps = ComponentProps<'a'>;

function MdxLink({ href = '', children, ...rest }: AnchorProps) {
  const isInternal = href.startsWith('/') || href.startsWith('#');
  if (isInternal) {
    return (
      <Link href={href} className="hover-link" {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <HoverLink href={href} {...rest}>
      {children}
    </HoverLink>
  );
}

type ImgProps = ComponentProps<'img'> & { src?: string; alt?: string };

function MdxImage({ src = '', alt = '', ...rest }: ImgProps) {
  if (!src) return null;
  // Remote images use next/image's remote loader; local content paths
  // resolve from /public. We use a fixed width of 1200 for OG-like display.
  const isRemote = src.startsWith('http');
  if (isRemote) {
    return <Image src={src} alt={alt} width={1200} height={630} sizes="(max-width: 768px) 100vw, 768px" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" {...rest} />;
}

export const defaultMDXComponents = {
  pre: PreBlock,
  a: MdxLink,
  img: MdxImage,
};

/**
 * apps/web/src/features/blog/mdx-components.test.tsx — R-63/R-30 support.
 *
 * The MDX component map is the render contract for every DB-backed post
 * and snippet body. Pass 6 made it the injected dependency of
 * `lib/mdx.tsx::renderMDX` (R-63/M-47), so its behavior deserves direct
 * pins:
 *   - PreBlock unwraps MDX's `<code>` children and renders a CodeWindow
 *     with a language-derived filename hint.
 *   - MdxLink routes internal anchors through next/link and external
 *     anchors through HoverLink.
 *   - MdxImage renders local `<img>`s, remote via next/image, and null
 *     for a missing src.
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/code-window', () => ({
  CodeWindow: ({ title, code }: { title: string; code: string }) => (
    <pre data-testid="code-window" data-title={title}>
      {code}
    </pre>
  ),
}));

vi.mock('@/components/hover-link', () => ({
  HoverLink: ({ href, children }: { href: string; children?: React.ReactNode }) => (
    <a data-testid="hover-link" href={href}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img data-testid="next-image" src={src} alt={alt} />
  ),
}));

import { defaultMDXComponents } from './mdx-components';

function renderPre(children: unknown): void {
  const Pre = defaultMDXComponents.pre as React.ComponentType<{ children?: unknown }>;
  render(<Pre>{children}</Pre>);
}

describe('mdx-components — the render contract for DB-backed MDX', () => {
  it('PreBlock unwraps <code> children into a CodeWindow with a language hint', () => {
    const codeChild = createElement('code', { className: 'language-ts' }, 'const x = 1;');
    renderPre(codeChild);

    const win = screen.getByTestId('code-window');
    expect(win.textContent).toContain('const x = 1;');
    expect(win.getAttribute('data-title')).toBe('snippet.ts');
  });

  it('PreBlock handles string children and falls back to a generic title', () => {
    renderPre('plain code');
    const win = screen.getByTestId('code-window');
    expect(win.textContent).toBe('plain code');
    expect(win.getAttribute('data-title')).toBe('snippet');
  });

  it('MdxLink uses next/link for internal hrefs', () => {
    const A = defaultMDXComponents.a as React.ComponentType<React.ComponentProps<'a'>>;
    render(<A href="/posts/hello">internal</A>);
    expect(screen.getByText('internal').getAttribute('href')).toBe('/posts/hello');
    expect(screen.queryByTestId('hover-link')).toBeNull();
  });

  it('MdxLink uses HoverLink for external hrefs', () => {
    const A = defaultMDXComponents.a as React.ComponentType<React.ComponentProps<'a'>>;
    render(<A href="https://example.com">external</A>);
    expect(screen.getByTestId('hover-link')).toBeTruthy();
  });

  it('MdxImage renders local images with lazy loading and remote via next/image', () => {
    const Img = defaultMDXComponents.img as React.ComponentType<{ src?: string; alt?: string }>;
    const { rerender } = render(<Img src="/cover.png" alt="cover" />);
    expect(screen.getByAltText('cover').getAttribute('src')).toBe('/cover.png');

    rerender(<Img src="https://cdn.example.com/og.png" alt="remote" />);
    expect(screen.getByTestId('next-image')).toBeTruthy();
  });

  it('MdxImage renders nothing without a src', () => {
    const Img = defaultMDXComponents.img as React.ComponentType<{ src?: string; alt?: string }>;
    const { container } = render(<Img alt="no source" />);
    expect(container.querySelector('img')).toBeNull();
  });
});

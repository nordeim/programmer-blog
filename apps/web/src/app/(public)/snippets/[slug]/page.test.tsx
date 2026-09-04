/**
 * apps/web/src/app/(public)/snippets/[slug]/page.test.tsx — R-64 (Pass 6, M-48).
 *
 * Pins the single-`<h1>` contract on snippet pages. R-54 fixed post
 * pages (the MDX body's leading `# …` rendered a second h1) but left
 * snippets doing the same thing — verified live in the Pass 6 E2E:
 * `curl -s .../snippets/use-typewriter | grep -c '<h1'` → 2.
 *
 * The fix mirrors R-54: `stripLeadingH1()` on the MDX body before
 * render; the page header owns the only h1.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getSnippetBySlugMock, listSnippetsMock } = vi.hoisted(() => ({
  getSnippetBySlugMock: vi.fn(),
  listSnippetsMock: vi.fn(),
}));

vi.mock('@/lib/snippets', () => ({
  getSnippetBySlug: (...args: unknown[]) => getSnippetBySlugMock(...args),
  listSnippets: (...args: unknown[]) => listSnippetsMock(...args),
}));

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' },
}));

// Server-only guard is mocked globally; renderMDX is mocked to avoid
// pulling the real next-mdx-remote pipeline into jsdom.
vi.mock('@/lib/mdx', () => ({
  renderMDX: async (source: string) => {
    // Mirror the real contract: the MDX body renders verbatim.
    const { createElement } = await import('react');
    return createElement('div', { 'data-testid': 'mdx-body' }, source);
  },
}));

// The route module imports server-only via lib modules above.
vi.mock('server-only', () => ({}));

// Next's notFound() throws a sentinel — mirror that contract.
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_HTTP_ERROR_FALLBACK;404');
  },
}));

import SnippetRoute from './page';

const SNIPPET = {
  slug: 'use-typewriter',
  title: 'useTypewriter',
  excerpt: 'A lightweight React hook that types text out character-by-character.',
  // Real snippet files start with their own `# Heading` — the regression
  // source for the second h1.
  content: '# useTypewriter\n\nSome body copy about the hook.\n',
};

describe('snippet detail page — R-64 / M-48 single-h1 contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSnippetBySlugMock.mockResolvedValue(SNIPPET);
    listSnippetsMock.mockResolvedValue([SNIPPET]);
  });

  it('strips the MDX body leading h1 so the page renders exactly one', async () => {
    const ui = await SnippetRoute({ params: Promise.resolve({ slug: 'use-typewriter' }) });
    const { container } = render(ui);

    const h1s = container.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0]?.textContent).toContain('useTypewriter');
    // The stripped heading must not leak into the rendered body either.
    const body = screen.getByTestId('snippet-body');
    expect(body.textContent).not.toMatch(/^#\s/m);
  });

  it('renders the body content after the leading heading is stripped', async () => {
    const ui = await SnippetRoute({ params: Promise.resolve({ slug: 'use-typewriter' }) });
    render(ui);

    const body = screen.getByTestId('snippet-body');
    expect(body.textContent).toContain('Some body copy about the hook.');
  });

  it('falls back to notFound() for an unknown slug', async () => {
    getSnippetBySlugMock.mockResolvedValue(null);

    await expect(
      SnippetRoute({ params: Promise.resolve({ slug: 'nope' }) }),
    ).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

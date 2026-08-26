/**
 * apps/web/src/app/(public)/snippets/page.test.tsx — TDD RED+GREEN 5.3.
 *
 * Verifies:
 *   - empty content dir → empty-state copy
 *   - 5 snippets → 5 cards in the grid
 *   - each card links to /snippets/<slug> with title + excerpt
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_GITHUB_REPO: 'tailwindlabs/tailwindcss',
    NEXT_PUBLIC_AUTHOR_EMAIL: 'hi@devlog.example',
    GITHUB_STATS_FALLBACK_STARS: 82400,
    GITHUB_STATS_FALLBACK_FORKS: 4180,
  },
}));

const listSnippetsMock = vi.fn();

vi.mock('@/lib/snippets', () => ({
  listSnippets: () => listSnippetsMock(),
  getSnippetBySlug: () => null,
}));

vi.mock('@/lib/mdx', () => ({
  renderMDX: vi.fn(async (source: string) => (
    <div data-testid="mdx-body">{source}</div>
  )),
}));

import SnippetsIndex from './page';

const SAMPLE_SNIPPETS = [
  {
    slug: 'use-typewriter',
    title: 'useTypewriter',
    excerpt: 'A lightweight React hook that types text out character-by-character.',
    content: '# useTypewriter',
  },
  {
    slug: 'use-mouse-glow',
    title: 'useMouseGlow',
    excerpt: 'Adds a soft radial glow that follows the cursor inside a container.',
    content: '# useMouseGlow',
  },
  {
    slug: 'use-reveal',
    title: 'useReveal',
    excerpt: 'Reveals an element with a fade-in-up when it scrolls into view.',
    content: '# useReveal',
  },
  {
    slug: 'use-scroll-progress',
    title: 'useScrollProgress',
    excerpt: 'Returns a 0–1 number indicating how far the page has been scrolled.',
    content: '# useScrollProgress',
  },
  {
    slug: 'use-usage',
    title: 'useUsage',
    excerpt: 'A tiny hook for surfacing usage hints in component demos.',
    content: '# useUsage',
  },
];

describe('SnippetsIndex', () => {
  beforeEach(() => {
    listSnippetsMock.mockReset();
  });

  it('renders the empty-state copy when no snippets exist', async () => {
    listSnippetsMock.mockResolvedValue([]);
    const ui = await SnippetsIndex();
    const { getByText } = render(ui);
    expect(getByText(/no snippets published yet/i)).toBeTruthy();
  });

  it('renders 5 snippet cards when 5 snippets are present', async () => {
    listSnippetsMock.mockResolvedValue(SAMPLE_SNIPPETS);
    const ui = await SnippetsIndex();
    const { container } = render(ui);
    const cards = container.querySelectorAll('[data-testid="snippet-grid"] > li');
    expect(cards.length).toBe(5);
  });

  it('links each card to /snippets/<slug>', async () => {
    listSnippetsMock.mockResolvedValue(SAMPLE_SNIPPETS);
    const ui = await SnippetsIndex();
    const { container } = render(ui);
    const links = container.querySelectorAll(`a[href^="/snippets/"]`);
    expect(links.length).toBe(5);
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/snippets/use-typewriter');
    expect(hrefs).toContain('/snippets/use-usage');
  });

  it('renders the title and excerpt for each snippet', async () => {
    listSnippetsMock.mockResolvedValue(SAMPLE_SNIPPETS);
    const ui = await SnippetsIndex();
    const { getByText } = render(ui);
    expect(getByText('useTypewriter')).toBeTruthy();
    expect(getByText(/types text out character-by-character/i)).toBeTruthy();
    expect(getByText('useMouseGlow')).toBeTruthy();
  });
});

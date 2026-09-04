/**
 * apps/web/src/app/(public)/archive/page.test.tsx — TDD RED+GREEN 5.1.
 *
 * Verifies:
 *   - empty DB → empty-state copy
 *   - seeded DB (6 posts) → 6 archive-item rows
 *   - 6 posts with pageSize 10 → no pager (hasMultiple=false)
 *   - 15 posts with pageSize 10 → pager visible + page-2 link
 *   - tag query preserved across page links
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Stub the env module so server-only lib/env doesn't blow up under jsdom.
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    NEXT_PUBLIC_GITHUB_REPO: 'tailwindlabs/tailwindcss',
    NEXT_PUBLIC_AUTHOR_EMAIL: 'hi@devlog.example',
    GITHUB_STATS_FALLBACK_STARS: 82400,
    GITHUB_STATS_FALLBACK_FORKS: 4180,
  },
}));

// Mock next/navigation's useRouter so TagFilter (a client component) renders.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/archive',
  useSearchParams: () => new URLSearchParams(),
}));

const mockGetArchivePosts = vi.fn();
const mockGetArchiveCount = vi.fn();
const mockGetTagsInUse = vi.fn();
const mockGetTagsForPosts = vi.fn();

vi.mock('@devlog/db', () => ({
  getArchivePosts: (...args: unknown[]) => mockGetArchivePosts(...args),
  getArchiveCount: (...args: unknown[]) => mockGetArchiveCount(...args),
  // R-50: the dropdown must be driven by tags-in-use, not getAllTags().
  getTagsInUse: (...args: unknown[]) => mockGetTagsInUse(...args),
  // R-51: real tags per archive row (batched lookup).
  getTagsForPosts: (...args: unknown[]) => mockGetTagsForPosts(...args),
}));

import ArchivePage from './page';

const TAGS = [
  { slug: 'javascript', name: 'JavaScript' },
  { slug: 'rust', name: 'Rust' },
];

function makePost(i: number) {
  const date = new Date(2024, 11 - i, 12); // months apart
  return {
    id: `p${i}`,
    slug: `post-${i}`,
    title: `Post ${i}`,
    excerpt: `Excerpt ${i}`,
    contentMdx: `# Post ${i}`,
    coverImageUrl: null,
    publishedAt: date,
    updatedAt: date,
    readingTimeMinutes: 5 + i,
    authorId: 'author-1',
    status: 'published' as const,
    createdAt: date,
  };
}

describe('ArchivePage', () => {
  beforeEach(() => {
    mockGetArchivePosts.mockReset();
    mockGetArchiveCount.mockReset();
    mockGetTagsInUse.mockReset();
    mockGetTagsForPosts.mockReset();
    mockGetTagsInUse.mockResolvedValue(TAGS);
    mockGetTagsForPosts.mockResolvedValue(new Map());
  });

  it('renders the empty-state copy when DB has zero posts', async () => {
    mockGetArchivePosts.mockResolvedValue([]);
    mockGetArchiveCount.mockResolvedValue(0);

    const ui = await ArchivePage({ searchParams: Promise.resolve({}) });
    const { container, getByText } = render(ui);

    expect(getByText(/no essays published yet/i)).toBeTruthy();
    expect(container.querySelectorAll('.archive-item').length).toBe(0);
    expect(container.querySelector('[data-testid="pagination"]')).toBeNull();
    const meta = container.querySelector('[data-testid="archive-meta"]');
    expect(meta?.textContent).toMatch(/showing 0–0 of 0/i);
  });

  it('renders 6 archive items when 6 posts are seeded', async () => {
    const posts = Array.from({ length: 6 }, (_, i) => makePost(i + 1));
    mockGetArchivePosts.mockResolvedValue(posts);
    mockGetArchiveCount.mockResolvedValue(6);

    const ui = await ArchivePage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.querySelectorAll('.archive-item').length).toBe(6);
    expect(container.querySelector('[data-testid="pagination"]')).toBeNull();
    const meta = container.querySelector('[data-testid="archive-meta"]');
    expect(meta?.textContent).toMatch(/showing 1–6 of 6/i);
  });

  it('renders the pager and a page-2 link when total > pageSize', async () => {
    const posts = Array.from({ length: 10 }, (_, i) => makePost(i + 1));
    mockGetArchivePosts.mockResolvedValue(posts);
    mockGetArchiveCount.mockResolvedValue(15);

    const ui = await ArchivePage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const pager = container.querySelector('[data-testid="pagination"]');
    expect(pager).not.toBeNull();
    const page2 = pager?.querySelector('a[href="/archive?page=2"]');
    expect(page2).not.toBeNull();
  });

  it('preserves the tag query across page links', async () => {
    const posts = Array.from({ length: 10 }, (_, i) => makePost(i + 1));
    mockGetArchivePosts.mockResolvedValue(posts);
    mockGetArchiveCount.mockResolvedValue(15);

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ tag: 'rust' }),
    });
    const { container } = render(ui);

    const pager = container.querySelector('[data-testid="pagination"]');
    const page2 = pager?.querySelector('a[href="/archive?tag=rust&page=2"]');
    expect(page2).not.toBeNull();
  });

  it('shows the empty-filter message when a tag yields no results', async () => {
    mockGetArchivePosts.mockResolvedValue([]);
    mockGetArchiveCount.mockResolvedValue(0);

    const ui = await ArchivePage({
      searchParams: Promise.resolve({ tag: 'rust' }),
    });
    const { getByText } = render(ui);
    expect(getByText(/no essays match this filter/i)).toBeTruthy();
  });

  it('renders each post tag instead of "Uncategorised" — R-51 (M-40)', async () => {
    const posts = Array.from({ length: 2 }, (_, i) => makePost(i + 1));
    mockGetArchivePosts.mockResolvedValue(posts);
    mockGetArchiveCount.mockResolvedValue(2);
    mockGetTagsForPosts.mockResolvedValue(
      new Map([
        ['p1', [{ id: 't1', slug: 'javascript', name: 'JavaScript' }]],
        ['p2', []], // a genuinely untagged post still falls back
      ]),
    );

    const ui = await ArchivePage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    const tags = Array.from(container.querySelectorAll('.archive-item .tag')).map(
      (el) => el.textContent,
    );
    expect(tags).toEqual(['JavaScript', 'Uncategorised']);
  });

  it('queries tags-in-use (not all tags) for the filter dropdown — R-50 (H-38)', async () => {
    const posts = Array.from({ length: 2 }, (_, i) => makePost(i + 1));
    mockGetArchivePosts.mockResolvedValue(posts);
    mockGetArchiveCount.mockResolvedValue(2);

    await ArchivePage({ searchParams: Promise.resolve({}) });

    expect(mockGetTagsInUse).toHaveBeenCalledTimes(1);
  });
});

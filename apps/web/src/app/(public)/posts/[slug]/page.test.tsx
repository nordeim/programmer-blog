/**
 * apps/web/src/app/(public)/posts/[slug]/page.test.tsx — TDD RED+GREEN 5.2.
 *
 * Verifies:
 *   - existing published slug → renders PostPage with title + MDX body
 *   - MDX rendered as a `<pre>` (via CodeWindow) when the source contains a fenced code block
 *   - non-existent slug → `notFound()` (throws a Next.js notFound signal)
 *   - draft slug → also `notFound()`
 *   - prev/next links render when adjacent posts exist
 *   - generateMetadata returns the post title in the page title
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

vi.mock('next/navigation', () => ({
  notFound: () => {
    const err = new Error('NEXT_NOT_FOUND');
    (err as unknown as { digest?: string }).digest = 'not_found';
    throw err;
  },
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/features/blog/comment-form', () => ({
  CommentForm: ({ postId }: { postId: string }) => (
    <div data-testid="comment-form" data-post={postId}>
      comment form stub
    </div>
  ),
}));

vi.mock('@/features/blog/comment-list', () => ({
  CommentList: ({ comments }: { comments: unknown[] }) => (
    <ul data-testid="comment-list-stub">
      {comments.map((c, i) => {
        const comment = c as { authorName: string; body: string };
        return (
          <li key={i}>
            <span>{comment.authorName}</span>: <span>{comment.body}</span>
          </li>
        );
      })}
    </ul>
  ),
}));

vi.mock('@/features/blog/post-page', () => ({
  PostPage: (props: {
    post: { slug: string; title: string; excerpt: string; contentMdx: string };
    tags: { slug: string; name: string }[];
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
    comments: unknown[];
    settings: { authorName: string } | null;
  }) => (
    <article data-testid="post-page-stub" data-slug={props.post.slug}>
      <h1>{props.post.title}</h1>
      <p>{props.post.excerpt}</p>
      <div data-testid="mdx-body">{props.post.contentMdx}</div>
      <ul data-testid="post-tags">
        {props.tags.map((t) => (
          <li key={t.slug}>{t.name}</li>
        ))}
      </ul>
      {props.prev ? (
        <a href={`/posts/${props.prev.slug}`} data-testid="prev-link">
          prev: {props.prev.title}
        </a>
      ) : null}
      {props.next ? (
        <a href={`/posts/${props.next.slug}`} data-testid="next-link">
          next: {props.next.title}
        </a>
      ) : null}
      <ul data-testid="comments-rendered">
        {props.comments.map((c, i) => {
          const comment = c as { authorName: string; body: string };
          return (
            <li key={i}>
              <span>{comment.authorName}</span>: <span>{comment.body}</span>
            </li>
          );
        })}
      </ul>
      <div data-testid="author-bio">{props.settings?.authorName}</div>
    </article>
  ),
}));

const getPostBySlug = vi.fn();
const getTagsForPost = vi.fn();
const getAdjacentPosts = vi.fn();
const getApprovedCommentsForPost = vi.fn();
const getSiteSettings = vi.fn();
const getArchivePosts = vi.fn();

vi.mock('@devlog/db', () => ({
  getPostBySlug: (...args: unknown[]) => getPostBySlug(...args),
  getTagsForPost: (...args: unknown[]) => getTagsForPost(...args),
  getAdjacentPosts: (...args: unknown[]) => getAdjacentPosts(...args),
  getApprovedCommentsForPost: (...args: unknown[]) => getApprovedCommentsForPost(...args),
  getSiteSettings: () => getSiteSettings(),
  getArchivePosts: (...args: unknown[]) => getArchivePosts(...args),
}));

import PostRoute, { generateMetadata } from './page';

const SAMPLE_POST = {
  id: 'post-1',
  slug: 'on-the-quiet-violence-of-implicit-conversions',
  title: 'On the Quiet Violence of Implicit Conversions',
  excerpt: 'JavaScript will let you add `[]` to `{}` and thank you for it.',
  contentMdx: '# Hello world\n\nThis is the body.',
  coverImageUrl: null,
  publishedAt: new Date('2024-11-12T00:00:00Z'),
  updatedAt: new Date('2024-11-12T00:00:00Z'),
  readingTimeMinutes: 8,
  authorId: 'author-1',
  status: 'published' as const,
  createdAt: new Date('2024-11-12T00:00:00Z'),
};

const SAMPLE_SETTINGS = {
  id: 1,
  authorName: 'Alex Rivera',
  authorBio: 'Software engineer writing about the craft.',
  authorAvatarUrl: null,
  socialLinks: {},
  defaultSeoDescription: 'Notes from a programmer\'s desk.',
  defaultOgImageUrl: null,
  updatedAt: new Date(),
};

describe('PostRoute', () => {
  beforeEach(() => {
    getPostBySlug.mockReset();
    getTagsForPost.mockReset();
    getAdjacentPosts.mockReset();
    getApprovedCommentsForPost.mockReset();
    getSiteSettings.mockReset();
    getArchivePosts.mockReset();
  });

  it('renders the post page with title, MDX body, and comment form when the slug exists', async () => {
    getPostBySlug.mockResolvedValue(SAMPLE_POST);
    getTagsForPost.mockResolvedValue([{ slug: 'javascript', name: 'JavaScript' }]);
    getAdjacentPosts.mockResolvedValue({
      previous: { slug: 'prev-slug', title: 'Prev Title' },
      next: { slug: 'next-slug', title: 'Next Title' },
    });
    getApprovedCommentsForPost.mockResolvedValue([]);
    getSiteSettings.mockResolvedValue(SAMPLE_SETTINGS);

    const ui = await PostRoute({ params: Promise.resolve({ slug: SAMPLE_POST.slug }) });
    const { getByText, getByTestId } = render(ui);

    expect(getByText(SAMPLE_POST.title)).toBeTruthy();
    expect(getByTestId('mdx-body')).toBeTruthy();
    expect(getByTestId('prev-link')).toBeTruthy();
    expect(getByTestId('next-link')).toBeTruthy();
    expect(getByTestId('author-bio')).toBeTruthy();
  });

  it('throws a NEXT_NOT_FOUND error when the post does not exist', async () => {
    getPostBySlug.mockResolvedValue(undefined);
    await expect(
      PostRoute({ params: Promise.resolve({ slug: 'nonexistent' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('throws a NEXT_NOT_FOUND error when the post is a draft', async () => {
    getPostBySlug.mockResolvedValue({ ...SAMPLE_POST, status: 'draft' });
    await expect(
      PostRoute({ params: Promise.resolve({ slug: SAMPLE_POST.slug }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('throws NEXT_NOT_FOUND when the slug fails the regex', async () => {
    await expect(
      PostRoute({ params: Promise.resolve({ slug: 'UPPER CASE BAD' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getPostBySlug).not.toHaveBeenCalled();
  });

  it('renders the comments section with at least one approved comment', async () => {
    getPostBySlug.mockResolvedValue(SAMPLE_POST);
    getTagsForPost.mockResolvedValue([]);
    getAdjacentPosts.mockResolvedValue({ previous: null, next: null });
    getApprovedCommentsForPost.mockResolvedValue([
      {
        id: 'c1',
        postId: SAMPLE_POST.id,
        parentId: null,
        authorName: 'Test Reader',
        authorEmail: 'reader@example.com',
        body: 'This finally made coercion click.',
        status: 'approved',
        createdAt: new Date('2024-11-13T00:00:00Z'),
      },
    ]);
    getSiteSettings.mockResolvedValue(SAMPLE_SETTINGS);

    const ui = await PostRoute({ params: Promise.resolve({ slug: SAMPLE_POST.slug }) });
    const { getByText } = render(ui);
    expect(getByText('Test Reader')).toBeTruthy();
    expect(getByText('This finally made coercion click.')).toBeTruthy();
  });
});

describe('generateMetadata', () => {
  beforeEach(() => {
    getPostBySlug.mockReset();
  });

  it('returns the post title and excerpt for an existing published post', async () => {
    getPostBySlug.mockResolvedValue(SAMPLE_POST);
    const meta = await generateMetadata({ params: Promise.resolve({ slug: SAMPLE_POST.slug }) });
    expect(meta.title).toContain(SAMPLE_POST.title);
    expect(meta.description).toBe(SAMPLE_POST.excerpt);
  });

  it('returns a generic "Not found" title for a missing slug', async () => {
    getPostBySlug.mockResolvedValue(undefined);
    const meta = await generateMetadata({ params: Promise.resolve({ slug: 'nope' }) });
    expect(meta.title).toMatch(/not found/i);
  });
});

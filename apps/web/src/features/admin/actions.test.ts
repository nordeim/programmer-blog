/**
 * apps/web/src/features/admin/actions.test.ts — TDD RED+GREEN 6.3.
 *
 * Tests the admin server actions: createPost (happy + auth + invalid),
 * moderateComment (auth), updateSiteSettings (auth + invalid).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { cookiesSpy, requireAuthorSpy, insertSpy, selectSpy, updateSpy, deleteSpy } =
  vi.hoisted(() => {
    const cookiesSpy = vi.fn();
    const requireAuthorSpy = vi.fn();
    const insertSpy = vi.fn();
    const selectSpy = vi.fn();
    const updateSpy = vi.fn();
    const deleteSpy = vi.fn();
    return { cookiesSpy, requireAuthorSpy, insertSpy, selectSpy, updateSpy, deleteSpy };
  });

vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));

vi.mock('@/lib/auth', () => ({
  SESSION_COOKIE: 'devlog_session',
  isAuthorRequiredError: (e: unknown) =>
    e instanceof Error && e.message === 'AUTHOR_REQUIRED',
  requireAuthor: (cookie: string | undefined) => requireAuthorSpy(cookie),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: (value: unknown) => {
      insertSpy(value);
      return {
        values: () => ({
          run: () => undefined,
          returning: () => ({
            get: () => ({ id: 'new-post-id' }),
          }),
        }),
      };
    },
    select: (cols?: unknown) => {
      selectSpy(cols);
      return {
        from: () => ({
          where: () => ({
            limit: () => ({ get: () => selectSpy(), all: () => selectSpy() }),
            all: () => selectSpy(),
          }),
          all: () => selectSpy(),
        }),
      };
    },
    update: () => ({
      set: (v: unknown) => {
        updateSpy(v);
        return { where: () => ({ run: () => undefined }) };
      },
    }),
    delete: () => ({
      where: () => {
        deleteSpy();
        return { run: () => undefined };
      },
    }),
  },
  schema: {
    posts: {
      id: 'posts.id',
      slug: 'posts.slug',
      title: 'posts.title',
      excerpt: 'posts.excerpt',
      contentMdx: 'posts.contentMdx',
      status: 'posts.status',
      publishedAt: 'posts.publishedAt',
      updatedAt: 'posts.updatedAt',
      readingTimeMinutes: 'posts.readingTimeMinutes',
      authorId: 'posts.authorId',
    },
    comments: { id: 'comments.id', status: 'comments.status' },
    siteSettings: { id: 'siteSettings.id' },
    tags: { id: 'tags.id', slug: 'tags.slug' },
    postsToTags: { postId: 'postsToTags.postId', tagId: 'postsToTags.tagId' },
  },
}));

import {
  createPost,
  deletePost,
  moderateComment,
  postInputSchema,
  siteSettingsInputSchema,
  updatePost,
  updateSiteSettings,
} from './actions';

describe('postInputSchema', () => {
  it('accepts a valid draft', () => {
    const r = postInputSchema.safeParse({
      title: 'A Title',
      slug: 'a-slug',
      excerpt: 'An excerpt.',
      contentMdx: '# Hello',
      status: 'draft',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a bad slug', () => {
    const r = postInputSchema.safeParse({
      title: 'T',
      slug: 'UPPER CASE',
      excerpt: 'E',
      contentMdx: '# H',
      status: 'draft',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an empty title', () => {
    const r = postInputSchema.safeParse({
      title: '',
      slug: 'a',
      excerpt: 'e',
      contentMdx: '# H',
      status: 'draft',
    });
    expect(r.success).toBe(false);
  });
});

describe('siteSettingsInputSchema', () => {
  it('accepts a valid settings payload', () => {
    const r = siteSettingsInputSchema.safeParse({
      authorName: 'Alex',
      authorBio: 'Engineer.',
      defaultSeoDescription: 'desc',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a non-URL github link', () => {
    const r = siteSettingsInputSchema.safeParse({
      authorName: 'Alex',
      authorBio: 'Engineer.',
      defaultSeoDescription: 'desc',
      githubUrl: 'not-a-url',
    });
    expect(r.success).toBe(false);
  });
});

describe('createPost', () => {
  beforeEach(() => {
    requireAuthorSpy.mockReset();
    insertSpy.mockReset();
    selectSpy.mockReset();
  });

  it('returns AUTH fail when the user is not an author', async () => {
    requireAuthorSpy.mockImplementation(() => {
      const e = new Error('AUTHOR_REQUIRED');
      throw e;
    });
    const r = await createPost({
      title: 'A',
      slug: 'a',
      excerpt: 'e',
      contentMdx: '# H',
      status: 'draft',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/signed in/i);
  });

  it('returns ok:true + postId on the happy path', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'user-1', role: 'author' });
    selectSpy.mockReturnValue(undefined); // no existing slug
    const r = await createPost({
      title: 'A Title',
      slug: 'a-slug',
      excerpt: 'An excerpt.',
      contentMdx: '# Hello\n\nworld.',
      status: 'draft',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r as { postId?: string }).postId).toBe('new-post-id');
  });

  it('returns a slug-taken error when slug already exists', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'user-1' });
    selectSpy.mockReturnValue({ id: 'existing-post' });
    const r = await createPost({
      title: 'A',
      slug: 'a-slug',
      excerpt: 'e',
      contentMdx: '# H',
      status: 'draft',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.slug).toMatch(/already taken/i);
  });
});

describe('updatePost / deletePost / moderateComment / updateSiteSettings', () => {
  beforeEach(() => {
    requireAuthorSpy.mockReset();
    updateSpy.mockReset();
    deleteSpy.mockReset();
  });

  it('updatePost fails when not author', async () => {
    requireAuthorSpy.mockImplementation(() => {
      throw new Error('AUTHOR_REQUIRED');
    });
    const r = await updatePost('p1', { title: 'New Title' });
    expect(r.ok).toBe(false);
  });

  it('updatePost succeeds on the happy path', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'u1' });
    const r = await updatePost('p1', { title: 'New Title' });
    expect(r.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalled();
  });

  it('deletePost fails when not author', async () => {
    requireAuthorSpy.mockImplementation(() => {
      throw new Error('AUTHOR_REQUIRED');
    });
    const r = await deletePost('p1');
    expect(r.ok).toBe(false);
  });

  it('deletePost succeeds on the happy path', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'u1' });
    const r = await deletePost('p1');
    expect(r.ok).toBe(true);
    expect(deleteSpy).toHaveBeenCalled();
  });

  it('moderateComment fails when not author', async () => {
    requireAuthorSpy.mockImplementation(() => {
      throw new Error('AUTHOR_REQUIRED');
    });
    const r = await moderateComment({ commentId: 'c1', action: 'approve' });
    expect(r.ok).toBe(false);
  });

  it('moderateComment succeeds on the happy path', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'u1' });
    const r = await moderateComment({ commentId: 'c1', action: 'approve' });
    expect(r.ok).toBe(true);
  });

  it('updateSiteSettings fails when not author', async () => {
    requireAuthorSpy.mockImplementation(() => {
      throw new Error('AUTHOR_REQUIRED');
    });
    const r = await updateSiteSettings({
      authorName: 'A',
      authorBio: 'B',
      defaultSeoDescription: 'D',
    });
    expect(r.ok).toBe(false);
  });

  it('updateSiteSettings succeeds on the happy path', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'u1' });
    const r = await updateSiteSettings({
      authorName: 'Alex Rivera',
      authorBio: 'Engineer.',
      defaultSeoDescription: 'desc',
    });
    expect(r.ok).toBe(true);
    expect(updateSpy).toHaveBeenCalled();
  });
});

void cookiesSpy;

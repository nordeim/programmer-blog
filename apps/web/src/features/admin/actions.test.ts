/**
 * apps/web/src/features/admin/actions.test.ts — TDD RED+GREEN 6.3.
 *
 * Tests the admin server actions: createPost (happy + auth + invalid),
 * moderateComment (auth), updateSiteSettings (auth + invalid).
 */
import { postInputSchema } from '@devlog/types';
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
  updatePost,
  updateSiteSettings,
} from './actions';
import { siteSettingsInputSchema } from './schemas';

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

  // R-65 (audit L-40): z.string().url() accepts `javascript:` and other
  // schemes. Social URLs must be http(s) so they can never become
  // script sources if a render sink is added later.
  it('rssUrl accepts the seeded site-relative value (R-87)', () => {
    // The seed writes rss = '/rss.xml'; R-65's absolute-URL guard made
    // every settings save of that untouched seed value fail.
    const r = siteSettingsInputSchema.safeParse({
      authorName: 'Alex',
      authorBio: 'Bio.',
      defaultSeoDescription: 'Desc.',
      rssUrl: '/rss.xml',
    });
    expect(r.success).toBe(true);
  });

  it('rssUrl still rejects an off-site-relative path like ../etc (R-87)', () => {
    const r = siteSettingsInputSchema.safeParse({
      authorName: 'Alex',
      authorBio: 'Bio.',
      defaultSeoDescription: 'Desc.',
      rssUrl: '../etc/passwd',
    });
    expect(r.success).toBe(false);
  });

  it.each(['githubUrl', 'twitterUrl', 'rssUrl'])(
    'rejects a javascript: scheme for %s (R-65)',
    (field) => {
      const r = siteSettingsInputSchema.safeParse({
        authorName: 'Alex',
        authorBio: 'Engineer.',
        defaultSeoDescription: 'desc',
        [field]: 'javascript:alert(1)',
      });
      expect(r.success).toBe(false);
    },
  );

  it.each(['githubUrl', 'twitterUrl', 'rssUrl'])(
    'rejects a data: scheme for %s (R-65)',
    (field) => {
      const r = siteSettingsInputSchema.safeParse({
        authorName: 'Alex',
        authorBio: 'Engineer.',
        defaultSeoDescription: 'desc',
        [field]: 'data:text/html,<b>x</b>',
      });
      expect(r.success).toBe(false);
    },
  );

  it('still accepts https and http social URLs (R-65)', () => {
    const r = siteSettingsInputSchema.safeParse({
      authorName: 'Alex',
      authorBio: 'Engineer.',
      defaultSeoDescription: 'desc',
      githubUrl: 'https://github.com/nordeim',
      twitterUrl: 'http://twitter.com/devlog',
    });
    expect(r.success).toBe(true);
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

  it('updatePost nulls publishedAt when a post returns to draft (R-83)', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'u1' });
    selectSpy.mockReturnValue(undefined); // no conflicting slug

    await updatePost('p1', { status: 'draft' });

    const setPayload = updateSpy.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(setPayload.status).toBe('draft');
    expect(setPayload.publishedAt).toBeNull();
  });

  it('updatePost rejects a slug that collides with a DIFFERENT post (R-83)', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'u1' });
    selectSpy.mockReturnValue({ id: 'other-post' }); // slug owned by another post

    const r = await updatePost('p1', { slug: 'taken-slug' });

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/slug/i);
  });

  it('updatePost allows re-saving the same slug for the same post (R-83)', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'u1' });
    selectSpy.mockReturnValue({ id: 'p1' }); // the post being edited itself

    const r = await updatePost('p1', { slug: 'same-slug' });

    expect(r.ok).toBe(true);
  });

  it('createPost dedupes tagSlugs before inserting join rows (R-82)', async () => {
    requireAuthorSpy.mockResolvedValue({ id: 'u1' });
    selectSpy.mockReset();
    insertSpy.mockReset();
    // The db mock's select() AND its .get()/.all() terminators hit the
    // same spy, so respond by call sequence: the slug-conflict check is
    // calls 1-2 (no conflict → undefined), the tag lookup is calls 3-4
    // (tag rows).
    let selectCall = 0;
    selectSpy.mockImplementation(() => {
      selectCall += 1;
      if (selectCall <= 2) return undefined;
      return [
        { id: 't1', slug: 'rust' },
        { id: 't2', slug: 'web' },
      ];
    });

    const r = await createPost({
      title: 'Tagged Post',
      slug: 'tagged-post',
      excerpt: 'E.',
      contentMdx: '# T',
      status: 'draft',
      tagSlugs: ['rust', 'rust', 'web', 'rust'],
    });

    expect(r.ok).toBe(true);
    // db.insert() receives the TABLE in this mock — the join-table mock
    // object is the one carrying a tagId key. Pre-dedupe: 4 inserts for
    // the 4-entry (duped) list; post-dedupe: exactly 2.
    const joinInserts = insertSpy.mock.calls.filter((c) => {
      const t = c[0] as { tagId?: unknown } | undefined;
      return typeof t === 'object' && t !== null && 'tagId' in t;
    });
    expect(joinInserts).toHaveLength(2);
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

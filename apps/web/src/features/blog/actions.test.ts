/**
 * apps/web/src/features/blog/actions.test.ts — TDD RED+GREEN 5.5.
 *
 * Tests for `createComment`:
 *   - happy path → inserts a pending row, returns ok+commentId
 *   - invalid input (empty body, oversized body, missing postId) → returns
 *     `ok:false` with `fieldErrors`
 *   - rate limit exceeded (11th request within 3600s) → `ok:false`
 *   - non-existent post → `ok:false` "Post not found"
 *
 * The DB layer is mocked at the @/lib/db level so the test stays in jsdom
 * with no real SQLite. Spies are declared via `vi.hoisted` so they are
 * available inside the hoisted `vi.mock` factories.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockDb, mockRateLimit, insertSpy, selectPostSpy, headerIp } = vi.hoisted(() => {
  const insertSpy = vi.fn();
  const selectPostSpy = vi.fn();
  const headerIp = { value: '203.0.113.7' };
  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => ({
        get: () => insertSpy(),
      })),
    })),
  }));
  const mockRateLimit = vi.fn().mockResolvedValue(true);
  const mockInsertAny = mockInsert as unknown as (value: unknown) => {
    values: (v: unknown) => { returning: () => { get: () => unknown } };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockDb: Record<string, (...args: any[]) => any> = {
    insert: (value: unknown) => mockInsertAny(value),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            get: () => selectPostSpy(),
          }),
        }),
      }),
    }),
  };
  return { mockDb, mockRateLimit, insertSpy, selectPostSpy, headerIp };
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
  schema: {
    posts: { id: 'posts.id', slug: 'posts.slug', status: 'posts.status' },
    comments: {
      id: 'comments.id',
      postId: 'comments.postId',
      parentId: 'comments.parentId',
    },
  },
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...(args as never[])),
  __resetRateLimit: vi.fn(),
}));

// R-40: the action reads the client IP from proxy headers via next/headers.
vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve({
      get: (name: string) => {
        if (name.toLowerCase() === 'x-forwarded-for') return headerIp.value;
        return null;
      },
    }),
}));

import { createComment, createCommentInputSchema } from './actions';

describe('createCommentInputSchema', () => {
  it('requires postId and body', () => {
    expect(createCommentInputSchema.safeParse({}).success).toBe(false);
  });

  it('accepts a valid input', () => {
    const r = createCommentInputSchema.safeParse({
      postId: 'p1',
      body: 'A real comment.',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a body shorter than 3 chars', () => {
    const r = createCommentInputSchema.safeParse({ postId: 'p1', body: '!' });
    expect(r.success).toBe(false);
  });

  it('rejects a body longer than 2000 chars', () => {
    const r = createCommentInputSchema.safeParse({ postId: 'p1', body: 'x'.repeat(2001) });
    expect(r.success).toBe(false);
  });
});

describe('createComment', () => {
  beforeEach(() => {
    insertSpy.mockReset();
    selectPostSpy.mockReset();
    mockRateLimit.mockResolvedValue(true);
    headerIp.value = '203.0.113.7';
  });

  it('returns ok:true + commentId on the happy path', async () => {
    selectPostSpy.mockReturnValue({ id: 'post-uuid', status: 'published' });
    insertSpy.mockReturnValue({ id: 'new-comment-uuid' });

    const result = await createComment({
      postId: 'post-uuid',
      body: 'A thoughtful comment.',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.commentId).toBe('new-comment-uuid');
    }
  });

  it('returns ok:false with fieldErrors on empty body', async () => {
    const result = await createComment({ postId: 'p1', body: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors?.body).toMatch(/at least/i);
    }
  });

  it('returns ok:false when post is not found', async () => {
    selectPostSpy.mockReturnValue(undefined);
    // The second lookup (by slug) also returns undefined.
    const result = await createComment({
      postId: 'does-not-exist',
      body: 'A real comment here.',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/post not found/i);
    }
  });

  it('returns ok:false when rate limit is exceeded', async () => {
    mockRateLimit.mockResolvedValueOnce(false);
    selectPostSpy.mockReturnValue({ id: 'p1', status: 'published' });
    const result = await createComment({
      postId: 'p1',
      body: 'A real comment here.',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/too many/i);
    }
  });

  // R-40 (H-35): the limiter must key on the REAL client IP read
  // server-side from proxy headers — never on postId (which puts every
  // visitor of a post into one shared 10/hour bucket).
  it('rate-limits by the client IP derived from proxy headers (R-40)', async () => {
    selectPostSpy.mockReturnValue({ id: 'p1', status: 'published' });
    await createComment({ postId: 'p1', body: 'A real comment here.' });
    expect(mockRateLimit).toHaveBeenCalledWith(
      'comment:203.0.113.7',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('falls back to the postId key only when no proxy headers exist (R-40)', async () => {
    headerIp.value = '';
    selectPostSpy.mockReturnValue({ id: 'p1', status: 'published' });
    await createComment({ postId: 'p1', body: 'A real comment here.' });
    expect(mockRateLimit).toHaveBeenCalledWith(
      'comment:unknown-p1',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('accepts a slug for postId and resolves it to a post id via the second lookup', async () => {
    let callCount = 0;
    selectPostSpy.mockImplementation(() => {
      callCount += 1;
      return callCount === 1 ? undefined : { id: 'post-uuid', status: 'published' };
    });
    insertSpy.mockReturnValue({ id: 'new-comment-uuid' });

    const result = await createComment({
      postId: 'a-slug',
      body: 'A real comment here.',
    });
    expect(result.ok).toBe(true);
  });
});

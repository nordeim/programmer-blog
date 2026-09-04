/**
 * apps/web/src/features/auth/next-url.test.ts — R-60 (Pass 6, M-44).
 *
 * `safeNext` guards every `/admin/login?next=` redirect target. The
 * sign-in action always used it, but the login PAGE redirected on the
 * raw searchParam — an already-authenticated author visiting
 * `/admin/login?next=https://evil.com` got 307-ed off-site. Both paths
 * now go through this module, and these tests pin its contract.
 */
import { describe, expect, it } from 'vitest';

import { safeNext } from './next-url';

describe('safeNext (R-60 / M-44)', () => {
  it('keeps same-origin /admin paths', () => {
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('/admin/posts')).toBe('/admin/posts');
    expect(safeNext('/admin/posts/new')).toBe('/admin/posts/new');
  });

  it('falls back to /admin for empty/undefined input', () => {
    expect(safeNext(undefined)).toBe('/admin');
    expect(safeNext(null)).toBe('/admin');
    expect(safeNext('')).toBe('/admin');
  });

  it('rejects absolute URLs (open-redirect vector)', () => {
    expect(safeNext('https://evil.com')).toBe('/admin');
    expect(safeNext('http://evil.com/admin')).toBe('/admin');
    expect(safeNext('HTTPS://EVIL.COM')).toBe('/admin');
    expect(safeNext('javascript:alert(1)')).toBe('/admin');
    expect(safeNext('data:text/html,<script>')).toBe('/admin');
  });

  it('rejects protocol-relative and backslash-trick targets', () => {
    expect(safeNext('//evil.com')).toBe('/admin');
    expect(safeNext('/\\evil.com')).toBe('/admin');
    expect(safeNext('\\/evil.com')).toBe('/admin');
    expect(safeNext('\\\\evil.com')).toBe('/admin');
  });

  it('rejects non-admin paths, traversal, and control characters', () => {
    expect(safeNext('/posts/some-post')).toBe('/admin');
    expect(safeNext('/admin/../..%2F..')).toBe('/admin');
    expect(safeNext('/admin?next=x\r\nSet-Cookie: 1')).toBe('/admin');
  });
});

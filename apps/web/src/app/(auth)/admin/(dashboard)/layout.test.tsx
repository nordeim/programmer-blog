/**
 * apps/web/src/app/(auth)/admin/(dashboard)/layout.test.tsx — R-31 (Pass 3).
 *
 * Verifies the guarded admin shell AFTER the R-31 route-group restructure:
 *   - the shell lives at `(auth)/admin/(dashboard)/layout.tsx`, so the login
 *     page (still at `(auth)/admin/login/`) never passes through it — the
 *     pre-R-31 `x-pathname` header sniff (a header nothing ever set) is gone;
 *   - an author session renders the sidebar shell (`admin-main`);
 *   - a missing/invalid session (`requireAuthor` throws
 *     `AuthorRequiredError`) attempts a redirect to `/admin/login`.
 *
 * Regression context (C-31): the old monolithic layout wrapped ALL of
 * `/admin/*` including `/admin/login`, detected the login page via
 * `headers.get('x-pathname')` — which nothing set — so anonymous visits to
 * `/admin/login` hit `requireAuthor(undefined)` → `redirect('/admin/login')`
 * forever (ERR_TOO_MANY_REDIRECTS in production).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Module mocks (inline factories — Vitest hoists vi.mock) ────────────────

const mockRedirect = vi.fn((target: string): never => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});

vi.mock('next/navigation', () => ({
  redirect: (target: string) => mockRedirect(target),
}));

// AuthorRequiredError sentinel class mirroring @devlog/auth's shape so
// isAuthorRequiredError can be exercised without importing server-only code.
class AuthorRequiredError extends Error {
  constructor() {
    super('AUTHOR_REQUIRED');
    this.name = 'AuthorRequiredError';
  }
}

const mockRequireAuthor = vi.fn();

vi.mock('@/lib/auth', () => ({
  SESSION_COOKIE: 'devlog_session',
  requireAuthor: (...args: unknown[]) => mockRequireAuthor(...args),
  isAuthorRequiredError: (e: unknown) =>
    e instanceof Error && e.name === 'AuthorRequiredError',
}));

vi.mock('@/features/auth/sign-out-button', () => ({
  SignOutButton: () => <button type="button">sign out</button>,
}));

// The layout reads the session cookie via next/headers.
const mockCookieGet = vi.fn();
vi.mock('next/headers', () => ({
  headers: () => Promise.resolve({ get: () => null }),
  cookies: () => Promise.resolve({ get: (name: string) => mockCookieGet(name) }),
}));

// Import AFTER mocks (hoisted anyway — keep the order explicit).
import AdminLayout from './layout';

const AUTHOR = {
  id: 'u1',
  email: 'author@devlog.example',
  name: 'Alex Rivera',
  role: 'author' as const,
  image: null,
};

function makeChildren() {
  return <div data-testid="page-content">dashboard body</div>;
}

describe('admin (dashboard) layout — R-31', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookieGet.mockReturnValue(undefined);
  });

  it('renders the shell + children for a valid author session', async () => {
    mockRequireAuthor.mockResolvedValue(AUTHOR);

    const ui = await AdminLayout({ children: makeChildren() });
    render(ui);

    expect(screen.getByTestId('admin-main')).toBeTruthy();
    expect(screen.getByTestId('page-content')).toBeTruthy();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('signed in as author@devlog.example')).toBeTruthy();
    // requireAuthor receives the cookie jar value (undefined here).
    expect(mockRequireAuthor).toHaveBeenCalledWith(undefined);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('redirects to /admin/login when the session is missing', async () => {
    mockRequireAuthor.mockRejectedValue(new AuthorRequiredError());

    await expect(
      AdminLayout({ children: makeChildren() }),
    ).rejects.toThrow('NEXT_REDIRECT:/admin/login?next=%2Fadmin');

    expect(mockRedirect).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login?next=%2Fadmin');
  });

  it('rethrows non-author errors untouched', async () => {
    mockRequireAuthor.mockRejectedValue(new Error('DB down'));

    await expect(
      AdminLayout({ children: makeChildren() }),
    ).rejects.toThrow('DB down');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('does NOT rely on an x-pathname header (C-31 regression pin)', async () => {
    // The shell must never branch on headers — with route groups the login
    // page cannot reach this layout at all. Pin it against RUNTIME usage:
    // no non-comment line of layout.tsx may reference 'x-pathname'.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const src = readFileSync(resolve(__dirname, 'layout.tsx'), 'utf8');
    const codeLines = src.split('\n').filter((l) => {
      const t = l.trim();
      const isComment =
        t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
      return !isComment;
    });
    const offenders = codeLines.filter((l) => l.includes('x-pathname'));
    expect(offenders).toEqual([]);
  });
});

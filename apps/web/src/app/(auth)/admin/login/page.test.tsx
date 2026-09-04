/**
 * apps/web/src/app/(auth)/admin/login/page.test.tsx — R-31 (Pass 3).
 *
 * Pins the C-31 regression contract: the login page must render the
 * sign-in form for an anonymous visitor — never redirect. (The
 * production redirect loop came from the old admin shell layout, which
 * used to wrap this page; the R-31 route-group restructure moves the
 * guarded shell to `(dashboard)/` so this page renders outside it.)
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockRedirect = vi.fn((target: string): never => {
  throw new Error(`NEXT_REDIRECT:${target}`);
});

vi.mock('next/navigation', () => ({
  redirect: (target: string) => mockRedirect(target),
}));

const mockGetSession = vi.fn();

vi.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
  SESSION_COOKIE: 'devlog_session',
}));

// Stub the client form so the test stays a pure route-level contract check.
vi.mock('@/features/auth/login-form', () => ({
  LoginForm: ({ nextHref = '/admin' }: { nextHref?: string }) => (
    <form data-testid="login-form-stub" data-next={nextHref} />
  ),
}));

// Login page reads the request cookie jar.
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: () => undefined }),
}));

import LoginPage from './page';

describe('admin login page — R-31 / C-31', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  it('renders the sign-in form for an anonymous visitor — no redirect', async () => {
    const ui = await LoginPage({ searchParams: Promise.resolve({}) });
    render(ui);

    expect(screen.getByTestId('login-form-stub')).toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockGetSession).toHaveBeenCalledWith(undefined);
  });

  it('passes the `next` search param through to the form', async () => {
    const ui = await LoginPage({
      searchParams: Promise.resolve({ next: '/admin/posts' }),
    });
    render(ui);

    const form = screen.getByTestId('login-form-stub');
    expect(form.getAttribute('data-next')).toBe('/admin/posts');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('still redirects an already-authenticated author to `next`', async () => {
    mockGetSession.mockResolvedValue({
      id: 'u1',
      email: 'author@devlog.example',
      name: 'Alex',
      role: 'author',
      image: null,
    });

    await expect(
      LoginPage({ searchParams: Promise.resolve({ next: '/admin' }) }),
    ).rejects.toThrow('NEXT_REDIRECT:/admin');
    expect(mockRedirect).toHaveBeenCalledWith('/admin');
  });
});

describe('admin login page — R-37 / C-35 (dev-credentials hint gating)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue(null);
  });

  it('does NOT render the dev-credentials hint in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const ui = await LoginPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(screen.getByTestId('login-form-stub')).toBeTruthy();
    expect(container.textContent).not.toContain('dev credentials');
    expect(container.textContent).not.toContain('dev-password-12345');
    vi.unstubAllEnvs();
  });

  it('renders the dev-credentials hint in development only', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const ui = await LoginPage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);

    expect(container.textContent).toContain('dev credentials');
    vi.unstubAllEnvs();
  });
});

/**
 * apps/web/src/features/auth/actions.test.ts — signInAction (R-8) + signOutAction.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

// vi.mock factories are hoisted above imports — use vi.hoisted for the
// shared mock fns so they exist when the factories run.
const { signInMock, signOutMock, rateLimitMock, cookieSet, cookieDelete } = vi.hoisted(() => ({
  signInMock: vi.fn(),
  signOutMock: vi.fn(),
  rateLimitMock: vi.fn<(key: string, max: number, windowSeconds: number) => Promise<boolean>>(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
}));

vi.mock('@devlog/auth', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (key: string, max: number, windowSeconds: number) => rateLimitMock(key, max, windowSeconds),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (name: string) => (name === 'x-forwarded-for' ? '203.0.113.9' : null),
  }),
  cookies: vi.fn().mockResolvedValue({
    set: (
      ...args: [string, string, Record<string, unknown>]
    ) => cookieSet(...args),
    delete: cookieDelete,
  }),
}));

import { signInAction, signOutAction } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  rateLimitMock.mockResolvedValue(true);
});

describe('signInAction (R-8 rate limit)', () => {
  it('passes through to auth signIn when the rate limit allows', async () => {
    signInMock.mockResolvedValue({ ok: true, user: { id: 'u1', role: 'author' } });
    const result = await signInAction({ email: 'author@devlog.example', password: 'x' });
    expect(rateLimitMock).toHaveBeenCalledWith('login:203.0.113.9', 5, 600);
    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, redirectTo: '/admin' });
  });

  it('blocks the 6th attempt without calling auth signIn', async () => {
    rateLimitMock.mockResolvedValue(false);
    const result = await signInAction({ email: 'a@b.co', password: 'x' });
    expect(result).toEqual({
      ok: false,
      error: 'Too many sign-in attempts. Try again in 10 minutes.',
    });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it('returns the auth error on failed credentials', async () => {
    signInMock.mockResolvedValue({ ok: false, error: 'Invalid email or password.' });
    const result = await signInAction({ email: 'a@b.co', password: 'wrong' });
    expect(result).toEqual({ ok: false, error: 'Invalid email or password.' });
  });

  it('only accepts next URLs under /admin (open-redirect guard)', async () => {
    signInMock.mockResolvedValue({ ok: true, user: { id: 'u1' } });
    const evil = await signInAction({
      email: 'a@b.co',
      password: 'x',
      next: 'https://evil.example/phish',
    });
    expect(evil).toEqual({ ok: true, redirectTo: '/admin' });
    const okNext = await signInAction({
      email: 'a@b.co',
      password: 'x',
      next: '/admin/posts',
    });
    expect(okNext).toEqual({ ok: true, redirectTo: '/admin/posts' });
  });

  it('sets the session cookie through the cookie jar on success', async () => {
    signInMock.mockImplementation(
      async (
        _email: string,
        _password: string,
        setCookie: (name: string, value: string, opts: Record<string, unknown>) => void,
      ) => {
        setCookie('devlog_session', 'token', { maxAge: 1, httpOnly: true, sameSite: 'lax', path: '/', secure: false });
        return { ok: true, user: { id: 'u1' } };
      },
    );
    await signInAction({ email: 'a@b.co', password: 'x' });
    expect(cookieSet).toHaveBeenCalledWith(
      'devlog_session',
      'token',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
  });
});

describe('signOutAction', () => {
  it('clears the cookie and redirects to the login page', async () => {
    signOutMock.mockImplementation(
      (clearCookie: (name: string, opts: { path: string }) => void) => {
        clearCookie('devlog_session', { path: '/' });
      },
    );
    const result = await signOutAction();
    expect(result).toEqual({ redirectTo: '/admin/login' });
    expect(cookieDelete).toHaveBeenCalledWith({ name: 'devlog_session', path: '/' });
  });
});

/**
 * apps/web/src/features/auth/actions.ts — FR-33.
 *
 * Server Action `signInAction({ email, password, next })`. Delegates to
 * `@devlog/auth::signIn`, which sets the session cookie via the
 * `cookies()` API from `next/headers`. On success returns
 * `{ ok: true, redirectTo }`. On failure returns `{ ok: false, error }`.
 *
 * R-8 (audit remediation): enforces PRD §5.4 login rate limit of 5
 * attempts per 10 minutes per IP, mirroring the pattern in
 * `features/subscribe/actions.ts`. Prevents brute-force attacks even
 * though R-1 (scrypt password verification) already eliminates the
 * previous "any password" bypass.
 *
 * Also exports `signOutAction()` which clears the cookie.
 */
'use server';

import 'server-only';
import { signIn as authSignIn, signOut as authSignOut } from '@devlog/auth';
import { cookies, headers } from 'next/headers';

import { rateLimit } from '@/lib/rate-limit';
import { getClientIpFromHeaders } from '@/lib/request-ip';

const ALLOWED_NEXT_PREFIX = '/admin';
const LOGIN_RATE_LIMIT_PER_10_MIN = 5;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 600;

function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith(ALLOWED_NEXT_PREFIX)) {
    return ALLOWED_NEXT_PREFIX;
  }
  return next;
}

export interface SignInSuccess {
  ok: true;
  redirectTo: string;
}

export interface SignInFailure {
  ok: false;
  error: string;
}

export type SignInResult = SignInSuccess | SignInFailure;

export async function signInAction(input: {
  email: string;
  password: string;
  next?: string;
}): Promise<SignInResult> {
  const { email, password, next } = input;

  // R-8: rate limit by IP before any DB lookup to prevent brute-force.
  const headersList = await headers();
  const ip = getClientIpFromHeaders(headersList);
  const allowed = await rateLimit(
    `login:${ip}`,
    LOGIN_RATE_LIMIT_PER_10_MIN,
    LOGIN_RATE_LIMIT_WINDOW_SECONDS,
  );
  if (!allowed) {
    return {
      ok: false,
      error: 'Too many sign-in attempts. Try again in 10 minutes.',
    };
  }

  const jar = await cookies();
  const result = await authSignIn(email, password, (name, value, opts) => {
    jar.set(name, value, {
      maxAge: opts.maxAge,
      httpOnly: opts.httpOnly,
      sameSite: opts.sameSite,
      path: opts.path,
      secure: opts.secure,
    });
  });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, redirectTo: safeNext(next) };
}

export async function signOutAction(): Promise<{ redirectTo: string }> {
  const jar = await cookies();
  authSignOut((name, opts) => {
    jar.delete({ name, path: opts.path });
  });
  return { redirectTo: '/admin/login' };
}

/**
 * apps/web/src/features/auth/actions.ts — FR-33.
 *
 * Server Action `signInAction({ email, password, next })`. Delegates to
 * `@devlog/auth::signIn`, which sets the session cookie via the
 * `cookies()` API from `next/headers`. On success returns
 * `{ ok: true, redirectTo }`. On failure returns `{ ok: false, error }`.
 *
 * Also exports `signOutAction()` which clears the cookie.
 */
'use server';

import 'server-only';
import { signIn as authSignIn, signOut as authSignOut } from '@devlog/auth';
import { cookies } from 'next/headers';


const ALLOWED_NEXT_PREFIX = '/admin';

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

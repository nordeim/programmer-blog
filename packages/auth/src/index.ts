/**
 * @devlog/auth — Phase 6 implementation.
 *
 * Re-exports the pure-crypto helpers from `./tokens` (edge-safe)
 * and adds the DB-dependent session functions (signIn, signOut,
 * getSession, requireAuthor). The DB-dependent code lives here so
 * the edge middleware can import from `@devlog/auth/tokens` and
 * avoid pulling in better-sqlite3 + drizzle-orm.
 *
 * Cookie name: `devlog_session`. Format (token v2, R-39): `<userId>.<iat-seconds>.<hmac(userId.iat)>`. The
 * HMAC is SHA-256 keyed by `BETTER_AUTH_SECRET`; `verifySessionToken`
 * (in `./tokens`) enforces the 30-day TTL server-side and rejects legacy
 * 2-part tokens, so old sessions force a re-login.
 *
 * Server-only.
 */
import 'server-only';
import { db, eq, schema } from '@devlog/db';
import { cookies } from 'next/headers';

// Import + re-export the pure-crypto helpers from tokens.ts (edge-safe).
import { hashPassword, verifyPassword } from './password';
import {
  SESSION_COOKIE,
  SESSION_TTL,
  createSessionToken,
  createTransactionToken,
  signToken,
  verifySessionToken,
  verifyToken,
  verifyTransactionToken,
} from './tokens';

export {
  SESSION_COOKIE,
  SESSION_TTL,
  createSessionToken,
  createTransactionToken,
  hashPassword,
  signToken,
  verifyPassword,
  verifySessionToken,
  verifyToken,
  verifyTransactionToken,
};

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: 'author' | 'subscriber';
  image: string | null;
}

/**
 * R-96 (Pass 8, H-43): pre-generated scrypt hash in the standard
 * `scrypt:N:r:p:salt:hash` format, of an unrelated throwaway secret.
 * Consumed only by the sign-in rejection branches so that an unknown
 * email costs the same scrypt work (N=2^15, r=8, p=1) as a wrong
 * password — see the comment in `signIn` below.
 */
const TIMING_EQUALIZER_HASH =
  'scrypt:32768:8:1:fd76515d926b70155f1470447bd94c8c:a2a4d722fe2bb220052d46e9f0c2b39359710fbe60aca44f29a6f2981523e05bcede327535eb6e1e824add102e434e04dc3a4df3819630eca2c7cd0eebe00071';

/**
 * Attempt to sign a user in by email + password. Returns `{ ok, user? }`
 * on success. Sets the session cookie via the `cookie` callback param
 * (since this runs in a server action context where we don't have
 * direct Response access).
 *
 * Password verification (R-1 audit remediation): the passwordHash column
 * stores a scrypt hash in format `scrypt:N:r:p:salt:hash`. We verify with
 * `verifyPassword(password, user.passwordHash)` using `timingSafeEqual` to
 * prevent timing attacks. Wrong password returns the same error message
 * as "no account" to prevent user enumeration.
 *
 * Server-only.
 */
export async function signIn(
  email: string,
  password: string,
  setCookie: (name: string, value: string, opts: { maxAge: number; httpOnly: boolean; sameSite: 'lax' | 'strict' | 'none'; path: string; secure: boolean }) => void,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  try {
    const rows = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1)
      .all();
    const user = rows[0];
    // Same error message for "no user" and "wrong password" — prevents
    // user enumeration via the login form.
    const genericError = 'Invalid email or password.';
    // R-96 (Pass 8, H-43): a known email + wrong password runs scrypt
    // N=2^15 (~100ms) while an unknown email used to return before any
    // scrypt work — a response-time delta that distinguishes valid
    // author emails (OWASP authentication-failure enumeration). Both
    // "fail fast" branches below first run a REAL scrypt verification
    // against this pre-generated constant hash so every rejected sign-in
    // does comparable work before returning the same generic error.
    // The hash is of an unrelated throwaway secret — it never validates
    // anything; it only equalizes the work factor.
    if (!user || user.role !== 'author') {
      verifyPassword(password, TIMING_EQUALIZER_HASH);
      return { ok: false, error: genericError };
    }
    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: genericError };
    }
    const token = await createSessionToken(user.id);
    setCookie(SESSION_COOKIE, token, {
      maxAge: SESSION_TTL,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    });
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image ?? null,
      },
    };
  } catch (e) {
    console.error('[auth] signIn failed', e);
    return { ok: false, error: 'Server error. Please try again.' };
  }
}

/**
 * Clears the session cookie.
 */
export function signOut(
  clearCookie: (name: string, opts: { path: string }) => void,
): void {
  clearCookie(SESSION_COOKIE, { path: '/' });
}

/**
 * Reads the session cookie value and returns the user, or `null`
 * when not signed in or session is invalid.
 */
export async function getSession(cookieValue: string | undefined | null): Promise<SessionUser | null> {
  if (!cookieValue) return null;
  const userId = await verifySessionToken(cookieValue);
  if (!userId) return null;
  try {
    const rows = db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1).all();
    const user = rows[0];
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: user.image ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Reads the session cookie via Next's request-scoped cookie jar and
 * returns the user, or `null` when not signed in or session is invalid.
 *
 * R-25 (audit remediation): previously this read a
 * `globalThis.__devlog_test_cookies` backdoor — impossible in production
 * (Next's cookie jar is request-scoped) and a smell. Now it uses
 * `next/headers`' `cookies()` (server-only, request-scoped) which is the
 * real production path.
 */
export async function getSessionFromCookies(): Promise<SessionUser | null> {
  const jar = await cookies();
  return getSession(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Returns the session user, or throws an error indicating the caller
 * should call `notFound()` or `redirect('/admin/login')`. The error
 * is a plain Error subclass so server components can catch and
 * convert to the right Next.js primitive.
 */
export async function requireAuthor(
  cookieValue: string | undefined | null,
): Promise<SessionUser> {
  const user = await getSession(cookieValue);
  if (!user || user.role !== 'author') {
    throw new AuthorRequiredError();
  }
  return user;
}

export class AuthorRequiredError extends Error {
  constructor() {
    super('AUTHOR_REQUIRED');
    this.name = 'AuthorRequiredError';
  }
}

export function isAuthorRequiredError(e: unknown): boolean {
  return e instanceof AuthorRequiredError;
}

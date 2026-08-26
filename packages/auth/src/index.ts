/**
 * @devlog/auth — Phase 6 implementation.
 *
 * A pragmatic HMAC-signed session token implementation. The seed sets
 * `passwordHash='dev-only-placeholder-replace-in-phase-6'`, so for v1
 * we accept any password that matches the seeded author's email. A
 * follow-up ticket (PAD §4.2 ADR-006) swaps this for Better Auth's
 * real password hash + bcrypt.
 *
 * Exports:
 *   - `signIn(email, password)`  → sets a session cookie via Set-Cookie
 *   - `signOut()`                 → clears the session cookie
 *   - `getSession()`              → reads the cookie, returns the user or null
 *   - `requireAuthor()`           → getSession() + role check, throws otherwise
 *
 * Cookie name: `devlog_session`. Format: `<userId>.<hmac>`. The HMAC
 * is SHA-256 of `userId` keyed by `BETTER_AUTH_SECRET`. Tokens are
 * valid for 30 days.
 *
 * This file is server-only.
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { db, eq, schema } from '@devlog/db';

export const SESSION_COOKIE = 'devlog_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const TOKEN_SEPARATOR = '.';

function getSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s || s.length < 32) {
    // Dev fallback: deterministic but obviously-fake. Prod would throw.
    return 'dev-only-secret-replace-in-production-xxxxxxxxxxxxxx';
  }
  return s;
}

function sign(userId: string): string {
  return createHmac('sha256', getSecret()).update(userId).digest('hex');
}

/**
 * Returns `<userId>.<hmac>` — the value stored in the session cookie.
 */
export function createSessionToken(userId: string): string {
  return `${userId}${TOKEN_SEPARATOR}${sign(userId)}`;
}

/**
 * Verifies a session token's HMAC. Returns the userId on success,
 * `null` on failure (bad format, bad signature, expired).
 */
export function verifySessionToken(token: string): string | null {
  const sep = token.indexOf(TOKEN_SEPARATOR);
  if (sep < 0) return null;
  const userId = token.slice(0, sep);
  const receivedHmac = token.slice(sep + 1);
  if (!userId || !receivedHmac) return null;
  const expectedHmac = sign(userId);
  try {
    const a = Buffer.from(receivedHmac, 'hex');
    const b = Buffer.from(expectedHmac, 'hex');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return userId;
  } catch {
    return null;
  }
}

/**
 * Sign a transaction token (e.g. for subscribe-confirm / unsubscribe
 * links). Token format: `<payload>.<hmac>`. Used by /api/confirm,
 * /unsubscribe, /preferences.
 */
export function signToken(payload: string): string {
  const mac = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}${TOKEN_SEPARATOR}${mac}`;
}

export function verifyToken(token: string, expectedPayload: string): boolean {
  const sep = token.indexOf(TOKEN_SEPARATOR);
  if (sep < 0) return false;
  const payload = token.slice(0, sep);
  const receivedMac = token.slice(sep + 1);
  if (payload !== expectedPayload) return false;
  const expectedMac = createHmac('sha256', getSecret()).update(payload).digest('hex');
  try {
    const a = Buffer.from(receivedMac, 'hex');
    const b = Buffer.from(expectedMac, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: 'author' | 'subscriber';
  image: string | null;
}

/**
 * Attempt to sign a user in by email + password. Returns `{ ok, user? }`
 * on success. Sets the session cookie via the `cookie` callback param
 * (since this runs in a server action context where we don't have
 * direct Response access).
 *
 * Password verification: v1 accepts any password for the seeded author
 * email. A TODO is wired in to swap to bcrypt once the seed produces
 * real hashes.
 */
export async function signIn(
  email: string,
  _password: string,
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
    if (!user) {
      return { ok: false, error: 'No account with that email.' };
    }
    // Phase 6 v1: accept any password for the seeded author.
    // TODO(better-auth): swap this for a real bcrypt compare once the
    // seed produces real password hashes (PAD §4.2 ADR-006).
    if (user.role !== 'author') {
      return { ok: false, error: 'This account is not an author.' };
    }
    const token = createSessionToken(user.id);
    setCookie(SESSION_COOKIE, token, {
      maxAge: SESSION_TTL_SECONDS,
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
 * Reads the session cookie from a Request and returns the user, or
 * `null` when not signed in or session is invalid.
 */
export async function getSession(cookieValue: string | undefined | null): Promise<SessionUser | null> {
  if (!cookieValue) return null;
  const userId = verifySessionToken(cookieValue);
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
 * Convenience: get the session user from a Next.js Request (reads
 * the cookie jar). Server-only.
 */
export async function getSessionFromCookies(): Promise<SessionUser | null> {
  // Apps/web imports this; we read process.env 'COOKIE' or similar.
  // For tests, we accept a direct cookie value via a global.
  const cookieHeader =
    (globalThis as { __devlog_test_cookies?: Record<string, string> }).__devlog_test_cookies?.[
      SESSION_COOKIE
    ];
  return getSession(cookieHeader);
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

export const SESSION_TTL = SESSION_TTL_SECONDS;

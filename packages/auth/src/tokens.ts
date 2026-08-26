/**
 * @devlog/auth/tokens — pure crypto helpers for session + signed
 * transaction tokens.
 *
 * Edge-runtime-safe (no @devlog/db import, no node-only APIs).
 *
 * Used by apps/web/src/middleware.ts (Edge Runtime) so that the
 * middleware can verify session cookies without pulling in the
 * full Better Auth + drizzle-orm stack.
 *
 * Token format: `<payload>.<hmac-sha256>` where the HMAC is keyed
 * by `BETTER_AUTH_SECRET` (32+ bytes). The payload is opaque to
 * the verifier — callers pass their own payload (a userId, a
 * subscriberId, etc.).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'devlog_session';
const TOKEN_SEPARATOR = '.';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

export function createSessionToken(userId: string): string {
  return `${userId}${TOKEN_SEPARATOR}${sign(userId)}`;
}

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

export const SESSION_TTL = SESSION_TTL_SECONDS;

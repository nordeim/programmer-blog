/**
 * @devlog/auth/tokens — pure crypto helpers for session + signed
 * transaction tokens.
 *
 * Edge-runtime-safe (no @devlog/db import, no node-only APIs).
 * Uses Web Crypto (crypto.subtle) so the Edge Runtime can verify
 * session cookies without pulling in the drizzle-orm + better-sqlite3
 * stack. The original implementation used `node:crypto` (createHmac +
 * timingSafeEqual) which Turbopack warns is not supported in the
 * Edge Runtime — see runtime_error.txt RC-1. This file now uses
 * `crypto.subtle` (available on both Node 20+ and Edge) and a
 * constant-time string compare, eliminating the `node:crypto` import
 * entirely.
 *
 * Used by apps/web/src/proxy.ts (Edge Runtime) so that the proxy can
 * verify session cookies without pulling in the
 * drizzle-orm + better-sqlite3 stack.
 *
 * R-2 (audit remediation / ADR-004 amendment): Better Auth was formally
 * substituted by this homegrown HMAC-SHA256 token design. Rationale:
 * Better Auth pulled ~1.2MB of dependencies (incl. styled-jsx →
 * @babel/core) for a single-author blog, while v1 only needs
 * email/password sign-in with an author-role gate. The HMAC design is
 * edge-safe (this file), server-only for DB lookups (index.ts), and
 * scrypt-hashed passwords (password.ts).
 *
 * Token format: `<payload>.<hmac-sha256>` where the HMAC is keyed
 * by `BETTER_AUTH_SECRET` (32+ bytes). The payload is opaque to
 * the verifier — callers pass their own payload (a userId, a
 * subscriberId, etc.).
 */

export const SESSION_COOKIE = 'devlog_session';
const TOKEN_SEPARATOR = '.';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  if (!s || s.length < 32) {
    // R-5 (audit remediation): in production we MUST NOT fall back to a
    // hardcoded dev secret — that would let anyone who reads this public
    // repo forge valid 30-day author session tokens for any deployment
    // that forgot to set BETTER_AUTH_SECRET. Throw instead.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'BETTER_AUTH_SECRET must be set to a value >= 32 chars in production.',
      );
    }
    // Dev fallback: deterministic but obviously-fake.
    return 'dev-only-secret-replace-in-production-xxxxxxxxxxxxxx';
  }
  return s;
}

async function hmacHex(message: string): Promise<string> {
  const secret = getSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(sig);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  // Constant-time compare on hex strings (prevents timing oracle).
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function isHex64(s: string): boolean {
  return /^[a-f0-9]{64}$/.test(s);
}

export async function createSessionToken(userId: string): Promise<string> {
  // R-39 (audit H-34): embed the issuance epoch so the 30-day TTL is
  // enforced SERVER-SIDE in verifySessionToken — previously the TTL lived
  // only in the cookie's maxAge and a stolen cookie never expired.
  // Token v2: `<userId>.<iat-seconds>.<hmac(userId.iat)>`.
  const iat = Math.floor(Date.now() / 1000);
  const payload = `${userId}${TOKEN_SEPARATOR}${iat}`;
  const mac = await hmacHex(payload);
  return `${payload}${TOKEN_SEPARATOR}${mac}`;
}

function isEpochSeconds(s: string): boolean {
  return /^\d{10}$/.test(s);
}

export async function verifySessionToken(token: string): Promise<string | null> {
  const firstSep = token.indexOf(TOKEN_SEPARATOR);
  if (firstSep < 0) return null;
  const secondSep = token.indexOf(TOKEN_SEPARATOR, firstSep + 1);
  if (secondSep < 0) return null;
  const userId = token.slice(0, firstSep);
  const issuedAt = token.slice(firstSep + 1, secondSep);
  const receivedHmac = token.slice(secondSep + 1);
  if (!userId || !issuedAt || !receivedHmac) return null;
  // R-39: legacy 2-part tokens (pre-R-39, no iat) are rejected outright —
  // they predate server-side expiry and must force a re-login.
  if (!isEpochSeconds(issuedAt)) return null;
  if (!isHex64(receivedHmac)) return null;
  const payload = `${userId}${TOKEN_SEPARATOR}${issuedAt}`;
  const expectedHmac = await hmacHex(payload);
  if (!timingSafeEqualHex(receivedHmac, expectedHmac)) return null;
  const ageSeconds = Math.floor(Date.now() / 1000) - Number(issuedAt);
  if (ageSeconds > SESSION_TTL_SECONDS) return null;
  return userId;
}

export async function signToken(payload: string): Promise<string> {
  const mac = await hmacHex(payload);
  return `${payload}${TOKEN_SEPARATOR}${mac}`;
}

export async function verifyToken(token: string, expectedPayload: string): Promise<boolean> {
  const sep = token.indexOf(TOKEN_SEPARATOR);
  if (sep < 0) return false;
  const payload = token.slice(0, sep);
  const receivedMac = token.slice(sep + 1);
  if (payload !== expectedPayload) return false;
  if (!isHex64(receivedMac)) return false;
  const expectedMac = await hmacHex(payload);
  return timingSafeEqualHex(receivedMac, expectedMac);
}

export const SESSION_TTL = SESSION_TTL_SECONDS;

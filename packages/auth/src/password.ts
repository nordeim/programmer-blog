/**
 * packages/auth/src/password.ts — scrypt password hashing (R-1 GREEN).
 *
 * Uses node:crypto.scrypt (built-in, no new dep). Cost factors
 * N=2^15, r=8, p=1 are the OWASP-recommended minimums as of 2024.
 * Salt is 16 bytes (32 hex chars). Hash output is 32 bytes (64 hex chars).
 *
 * Stored format: `scrypt:N:r:p:<salt-hex>:<hash-hex>`. The format prefix
 * lets us swap algorithms later (e.g. argon2) without breaking stored hashes.
 *
 * Server-only — uses node:crypto, not edge-safe. Tokens.ts is edge-safe;
 * this file is for the DB-backed auth layer only.
 */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const N = 1 << 15; // 32768 — OWASP 2024 minimum
const R = 8;
const P = 1;
const SALT_BYTES = 16;
const KEY_LENGTH = 32;
const PREFIX = 'scrypt';
// scryptSync default maxmem is 32MB; N=2^15 with r=8 needs ~32MB just for
// the Smix buffer. Bump to 128MB so the operation succeeds.
const MAXMEM = 128 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM });
  return `${PREFIX}:${N}:${R}:${P}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 6) return false;
  const [prefix, nStr, rStr, pStr, saltHex, hashHex] = parts;
  if (!prefix || !nStr || !rStr || !pStr || !saltHex || !hashHex) return false;
  if (prefix !== PREFIX) return false;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  let salt: Buffer;
  let expectedHash: Buffer;
  try {
    salt = Buffer.from(saltHex, 'hex');
    expectedHash = Buffer.from(hashHex, 'hex');
  } catch {
    return false;
  }
  if (salt.length === 0 || expectedHash.length === 0) return false;
  try {
    const computed = scryptSync(password, salt, expectedHash.length, { N, r, p, maxmem: MAXMEM });
    if (computed.length !== expectedHash.length) return false;
    return timingSafeEqual(computed, expectedHash);
  } catch {
    return false;
  }
}

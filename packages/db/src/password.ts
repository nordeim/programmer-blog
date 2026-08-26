/**
 * packages/db/src/password.ts — minimal scrypt helper for seeding.
 *
 * This is a copy of the algorithm in packages/auth/src/password.ts but
 * lives in @devlog/db so the seed script (which can't import @devlog/auth
 * without creating a circular dependency) can hash the dev author password
 * at seed time.
 *
 * The format MUST stay byte-identical to packages/auth/src/password.ts so
 * verifyPassword() (in @devlog/auth) accepts the hashes produced here.
 *
 * Format: `scrypt:N:r:p:<salt-hex>:<hash-hex>` where N=32768, r=8, p=1,
 * salt is 16 random bytes, hash output is 32 bytes.
 */
import { randomBytes, scryptSync } from 'node:crypto';

const N = 1 << 15;
const R = 8;
const P = 1;
const SALT_BYTES = 16;
const KEY_LENGTH = 32;
const PREFIX = 'scrypt';
const MAXMEM = 128 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: MAXMEM });
  return `${PREFIX}:${N}:${R}:${P}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

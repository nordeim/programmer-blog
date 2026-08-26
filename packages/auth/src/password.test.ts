/**
 * packages/auth/src/password.test.ts — scrypt password hashing tests (R-1 RED).
 *
 * Verifies that:
 *   - hashPassword returns a deterministic-format string `scrypt:N:r:p:salt:hash`.
 *   - verifyPassword returns true for the correct password.
 *   - verifyPassword returns false for a wrong password.
 *   - verifyPassword returns false for a malformed hash string.
 *   - Two calls to hashPassword(samePassword) produce different salts (and thus different hashes).
 */
import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashPassword returns a string prefixed with "scrypt:" and 6 colon-separated parts', () => {
    const hash = hashPassword('dev-password-12345');
    expect(hash.startsWith('scrypt:')).toBe(true);
    const parts = hash.split(':');
    expect(parts).toHaveLength(6);
    expect(parts[0]).toBe('scrypt');
    // N, r, p are integers; salt and hash are hex.
    expect(Number.isInteger(Number(parts[1] ?? ''))).toBe(true);
    expect(Number.isInteger(Number(parts[2] ?? ''))).toBe(true);
    expect(Number.isInteger(Number(parts[3] ?? ''))).toBe(true);
    expect((parts[4] ?? '').length).toBeGreaterThan(0);
    expect((parts[5] ?? '').length).toBeGreaterThan(0);
  });

  it('verifyPassword returns true for the correct password', () => {
    const hash = hashPassword('dev-password-12345');
    expect(verifyPassword('dev-password-12345', hash)).toBe(true);
  });

  it('verifyPassword returns false for a wrong password', () => {
    const hash = hashPassword('dev-password-12345');
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('verifyPassword returns false for a malformed hash string', () => {
    expect(verifyPassword('anything', 'not-a-valid-hash')).toBe(false);
    expect(verifyPassword('anything', 'scrypt:bad')).toBe(false);
    expect(verifyPassword('anything', 'scrypt:N:r:p:salt:hash')).toBe(false);
  });

  it('two hashPassword calls with the same password produce different salts (random salt)', () => {
    const a = hashPassword('same-password');
    const b = hashPassword('same-password');
    expect(a).not.toBe(b);
    // But both verify.
    expect(verifyPassword('same-password', a)).toBe(true);
    expect(verifyPassword('same-password', b)).toBe(true);
  });
});

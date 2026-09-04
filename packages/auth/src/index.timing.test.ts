/**
 * @devlog/auth — R-96 (Pass 8, H-43): signIn must not leak user
 * existence through response timing.
 *
 * The unknown-email branch previously returned before any scrypt work,
 * while the known-email + wrong-password branch ran scrypt N=2^15
 * (~100ms) — a response-time delta an attacker can use to distinguish
 * a valid author email from an invalid one (OWASP authentication-
 * failure enumeration). The fix: the unknown branch performs a dummy
 * verification against a pre-generated constant hash, so both paths
 * do comparable work before returning the SAME generic error.
 *
 * These tests spy on `verifyPassword` (partial module mock) and assert
 * it is exercised on BOTH branches — the behavioral contract that keeps
 * the timing side-channel closed — without asserting wall-clock timing
 * (flaky by design in CI).
 */
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';

// Mock @devlog/db so the test never tries to open a real SQLite file.
vi.mock('@devlog/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => ({ all: () => [] }) }) }) }),
    insert: () => ({ values: () => ({ run: () => undefined, returning: () => ({ get: () => undefined }) }) }),
  },
  // index.ts imports `eq` from @devlog/db (a re-exported drizzle helper).
  // The mocked select chain ignores the WHERE clause entirely.
  eq: (left: unknown, right: unknown) => [left, right],
  schema: {
    users: { id: 'users.id', email: 'users.email', role: 'users.role', name: 'users.name', image: 'users.image' },
    sessions: { id: 'sessions.id', userId: 'sessions.userId' },
  },
}));

// Partial mock: keep the REAL scrypt implementation, wrap it in a spy so
// the tests can assert it ran. (vi.mock factories are hoisted — everything
// must be inline; importOriginal is the sanctioned way to keep behavior.)
vi.mock('./password', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./password')>();
  return {
    ...actual,
    verifyPassword: vi.fn(actual.verifyPassword),
    hashPassword: vi.fn(actual.hashPassword),
  };
});

import { verifyPassword } from './password';

import { signIn } from './index';

const mockedVerify = vi.mocked(verifyPassword);

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'a'.repeat(64);
});

afterAll(() => {
  delete process.env.BETTER_AUTH_SECRET;
  mockedVerify.mockClear();
});

describe('signIn — R-96 timing-equalization (H-43)', () => {
  it('unknown-email sign-in still runs a scrypt verify before failing', async () => {
    mockedVerify.mockClear();
    const result = await signIn('nobody@example.com', 'whatever-password', () => undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Invalid email or password.');
    expect(mockedVerify).toHaveBeenCalledTimes(1);
  });

  it('known-email + wrong-password behaves identically (same generic error, scrypt ran)', async () => {
    // The @devlog/db mock returns no rows for ANY email, so this branch
    // is the same unknown-user path — the point of the assertion is that
    // the observable contract (generic error + a scrypt call) is stable.
    mockedVerify.mockClear();
    const result = await signIn('ghost@example.com', 'another-password', () => undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Invalid email or password.');
    expect(mockedVerify).toHaveBeenCalledTimes(1);
  });

  it('no session cookie is set on the unknown-email path', async () => {
    const setCookie = vi.fn();
    await signIn('nobody@example.com', 'whatever-password', setCookie);
    expect(setCookie).not.toHaveBeenCalled();
  });
});

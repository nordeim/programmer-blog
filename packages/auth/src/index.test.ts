/**
 * @devlog/auth — TDD tests for the session token + signToken helpers.
 *
 * signIn/signOut/getSession are integration tests that require a real
 * DB; they're covered at the apps/web layer via the route tests.
 * Here we cover the pure crypto helpers + edge cases.
 */
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';

// Mock @devlog/db so the test never tries to open a real SQLite file.
vi.mock('@devlog/db', () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ limit: () => ({ all: () => [] }) }) }) }),
    insert: () => ({ values: () => ({ run: () => undefined, returning: () => ({ get: () => undefined }) }) }),
  },
  schema: {
    users: { id: 'users.id', email: 'users.email', role: 'users.role', name: 'users.name', image: 'users.image' },
    sessions: { id: 'sessions.id', userId: 'sessions.userId' },
  },
}));

import {
  SESSION_COOKIE,
  createSessionToken,
  signToken,
  verifySessionToken,
  verifyToken,
} from './index';

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'a'.repeat(64);
});

afterAll(() => {
  delete process.env.BETTER_AUTH_SECRET;
});

describe('session tokens', () => {
  // R-39 (H-34): token v2 format is `<userId>.<iat-seconds>.<hmac>` — the
  // issuance epoch is embedded so verifySessionToken can enforce the
  // 30-day TTL server-side (previously the TTL was client-side only).
  it('createSessionToken returns <userId>.<iat>.<hmac> (token v2, R-39)', async () => {
    const t = await createSessionToken('user-123');
    expect(t).toMatch(/^user-123\.[0-9]{10}\.[a-f0-9]{64}$/);
  });

  it('the embedded iat is the current epoch in seconds', async () => {
    const before = Math.floor(Date.now() / 1000);
    const t = await createSessionToken('user-123');
    const after = Math.floor(Date.now() / 1000);
    const iat = Number(t.split('.')[1]);
    expect(iat).toBeGreaterThanOrEqual(before);
    expect(iat).toBeLessThanOrEqual(after);
  });

  it('verifySessionToken returns the userId for a valid fresh token', async () => {
    const t = await createSessionToken('user-123');
    expect(await verifySessionToken(t)).toBe('user-123');
  });

  it('verifySessionToken returns null for a tampered hmac', async () => {
    const t = await createSessionToken('user-123');
    const tampered = t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a');
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('verifySessionToken returns null for a malformed token', async () => {
    expect(await verifySessionToken('garbage')).toBeNull();
    expect(await verifySessionToken('')).toBeNull();
    expect(await verifySessionToken('userid-only')).toBeNull();
  });

  // R-2 (audit remediation): a token signed with a DIFFERENT secret must be
  // rejected — this pins the HMAC substitution design (no Better Auth; the
  // secret is the only trust root).
  it('verifySessionToken rejects a forged token signed with a different secret', async () => {
    const forged = await createSessionToken('user-123');
    // Rotate the secret, then verify the token minted under the old secret.
    const original = process.env.BETTER_AUTH_SECRET;
    process.env.BETTER_AUTH_SECRET = 'b'.repeat(64);
    try {
      expect(await verifySessionToken(forged)).toBeNull();
      // A token minted under the CURRENT secret is accepted.
      const fresh = await createSessionToken('user-123');
      expect(await verifySessionToken(fresh)).toBe('user-123');
    } finally {
      process.env.BETTER_AUTH_SECRET = original;
    }
  });

  it('verifySessionToken returns null when the hmac is not hex', async () => {
    expect(await verifySessionToken('user-123.1700000000.nothex')).toBeNull();
  });

  it('verifySessionToken returns null for a non-numeric iat segment', async () => {
    expect(await verifySessionToken('user-123.notanumber.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBeNull();
  });
});

describe('session tokens — R-39 server-side expiry (H-34)', () => {
  it('rejects a token older than SESSION_TTL (expired session)', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const t = await createSessionToken('user-123');
      // Advance past the 30-day TTL.
      vi.setSystemTime(new Date('2026-02-02T00:00:01Z'));
      expect(await verifySessionToken(t)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepts a token that is within SESSION_TTL', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const t = await createSessionToken('user-123');
      vi.setSystemTime(new Date('2026-01-30T23:59:59Z'));
      expect(await verifySessionToken(t)).toBe('user-123');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects a legacy 2-part token (pre-R-39 format) even with a valid HMAC', async () => {
    // signToken('user-123') produces exactly the legacy session format
    // `<userId>.<hmac(userId)>` — the verifier must not accept it.
    const legacy = await signToken('user-123');
    expect(await verifySessionToken(legacy)).toBeNull();
  });

  it('rejects when the iat is tampered (hmac binds userId + iat)', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      const t = await createSessionToken('user-123');
      const [userId, , mac] = t.split('.');
      // Re-sign the SAME payload but claim a fresh iat — the mac no longer
      // matches userId.newIat, so the token must be rejected.
      const forged = `${userId}.9999999999.${mac}`;
      expect(await verifySessionToken(forged)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('signToken / verifyToken', () => {
  it('signs and verifies a payload', async () => {
    const t = await signToken('subscriber-abc');
    expect(await verifyToken(t, 'subscriber-abc')).toBe(true);
  });

  it('returns false for the wrong payload', async () => {
    const t = await signToken('subscriber-abc');
    expect(await verifyToken(t, 'subscriber-xyz')).toBe(false);
  });

  it('returns false for a tampered token', async () => {
    const t = await signToken('subscriber-abc');
    const tampered = t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a');
    expect(await verifyToken(tampered, 'subscriber-abc')).toBe(false);
  });

  it('returns false for a malformed token', async () => {
    expect(await verifyToken('garbage', 'subscriber-abc')).toBe(false);
    expect(await verifyToken('', '')).toBe(false);
  });
});

describe('SESSION_COOKIE constant', () => {
  it('is a stable, non-empty string', () => {
    expect(typeof SESSION_COOKIE).toBe('string');
    expect(SESSION_COOKIE.length).toBeGreaterThan(0);
    expect(SESSION_COOKIE).toBe('devlog_session');
  });
});

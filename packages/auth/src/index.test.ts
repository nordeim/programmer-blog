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
  it('createSessionToken returns <userId>.<hmac>', () => {
    const t = createSessionToken('user-123');
    expect(t).toMatch(/^user-123\.[a-f0-9]{64}$/);
  });

  it('verifySessionToken returns the userId for a valid token', () => {
    const t = createSessionToken('user-123');
    expect(verifySessionToken(t)).toBe('user-123');
  });

  it('verifySessionToken returns null for a tampered hmac', () => {
    const t = createSessionToken('user-123');
    const tampered = t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a');
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it('verifySessionToken returns null for a malformed token', () => {
    expect(verifySessionToken('garbage')).toBeNull();
    expect(verifySessionToken('')).toBeNull();
    expect(verifySessionToken('userid-only')).toBeNull();
  });

  it('verifySessionToken returns null when the hmac is not hex', () => {
    expect(verifySessionToken('user-123.nothex')).toBeNull();
  });
});

describe('signToken / verifyToken', () => {
  it('signs and verifies a payload', () => {
    const t = signToken('subscriber-abc');
    expect(verifyToken(t, 'subscriber-abc')).toBe(true);
  });

  it('returns false for the wrong payload', () => {
    const t = signToken('subscriber-abc');
    expect(verifyToken(t, 'subscriber-xyz')).toBe(false);
  });

  it('returns false for a tampered token', () => {
    const t = signToken('subscriber-abc');
    const tampered = t.slice(0, -1) + (t.endsWith('a') ? 'b' : 'a');
    expect(verifyToken(tampered, 'subscriber-abc')).toBe(false);
  });

  it('returns false for a malformed token', () => {
    expect(verifyToken('garbage', 'subscriber-abc')).toBe(false);
    expect(verifyToken('', '')).toBe(false);
  });
});

describe('SESSION_COOKIE constant', () => {
  it('is a stable, non-empty string', () => {
    expect(typeof SESSION_COOKIE).toBe('string');
    expect(SESSION_COOKIE.length).toBeGreaterThan(0);
    expect(SESSION_COOKIE).toBe('devlog_session');
  });
});

/**
 * packages/auth/src/token-ttl.test.ts — R-80 (Pass 7, M-54).
 *
 * Pins the transaction-token v2 contract: confirmation tokens embed an
 * issuance epoch + purpose and are TTL-enforced server-side (7 days);
 * manage purposes (unsubscribe/preferences) keep long-lived links and
 * still verify legacy v1 (`<payload>.<hmac>`) tokens so links already
 * sitting in subscribers' inboxes keep working. A confirm-purpose token
 * must NOT authorize a manage purpose (purpose separation).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  CONFIRM_TOKEN_TTL_SECONDS,
  createTransactionToken,
  signToken,
  verifyTransactionToken,
  verifyToken,
} from './tokens';

const TXN_A = 'b'.repeat(32);

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = 'a'.repeat(32);
  process.env.SIGNED_TOKEN_SECRET = TXN_A;
});

afterAll(() => {
  delete process.env.BETTER_AUTH_SECRET;
  delete process.env.SIGNED_TOKEN_SECRET;
  vi.useRealTimers();
});

describe('transaction token v2 — TTL + purpose (R-80 / M-54)', () => {
  it('createTransactionToken(id, "confirm") emits <id>.<iat>.confirm.<hmac>', async () => {
    const token = await createTransactionToken('sub-1', 'confirm');
    const parts = token.split('.');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('sub-1');
    expect(parts[1]).toMatch(/^\d{10}$/);
    expect(parts[2]).toBe('confirm');
  });

  it('verifyTransactionToken accepts a fresh confirm token', async () => {
    const token = await createTransactionToken('sub-2', 'confirm');
    expect(await verifyTransactionToken(token, 'sub-2', 'confirm')).toBe(true);
  });

  it('rejects a confirm token older than the 7-day TTL', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = await createTransactionToken('sub-3', 'confirm');

    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + (CONFIRM_TOKEN_TTL_SECONDS + 60) * 1000);
    expect(await verifyTransactionToken(token, 'sub-3', 'confirm')).toBe(false);

    // A token minted recently enough still verifies.
    const fresh = await createTransactionToken('sub-3b', 'confirm');
    expect(await verifyTransactionToken(fresh, 'sub-3b', 'confirm')).toBe(true);
  });

  it('rejects a confirm token whose purpose does not match', async () => {
    const token = await createTransactionToken('sub-4', 'manage');
    expect(await verifyTransactionToken(token, 'sub-4', 'confirm')).toBe(false);
  });

  it('manage purpose verifies v2 tokens of the same purpose', async () => {
    const token = await createTransactionToken('sub-5', 'manage');
    expect(await verifyTransactionToken(token, 'sub-5', 'manage')).toBe(true);
  });

  it('manage purpose verifies a v2 manage token regardless of age (long-lived links by design)', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const token = await createTransactionToken('sub-5b', 'manage');
    vi.setSystemTime(new Date('2027-06-01T00:00:00Z'));
    expect(await verifyTransactionToken(token, 'sub-5b', 'manage')).toBe(true);
  });

  it('manage purpose still verifies legacy v1 tokens (inbox backward compat)', async () => {
    const legacy = await signToken('sub-6');
    expect(await verifyTransactionToken(legacy, 'sub-6', 'manage')).toBe(true);
  });

  it('confirm purpose REJECTS legacy v1 tokens (no TTL to enforce)', async () => {
    const legacy = await signToken('sub-7');
    expect(await verifyTransactionToken(legacy, 'sub-7', 'confirm')).toBe(false);
  });

  it('rejects a v2 token signed for a different payload', async () => {
    const token = await createTransactionToken('sub-8', 'confirm');
    expect(await verifyTransactionToken(token, 'sub-other', 'confirm')).toBe(false);
  });

  it('rejects a tampered purpose segment', async () => {
    const token = await createTransactionToken('sub-9', 'confirm');
    const forged = token.replace(/\.confirm\./, '.manage.');
    expect(await verifyTransactionToken(forged, 'sub-9', 'manage')).toBe(false);
  });

  it('legacy v1 verifyToken keeps working (pre-R-80 callers)', async () => {
    const legacy = await signToken('sub-10');
    expect(await verifyToken(legacy, 'sub-10')).toBe(true);
  });
});

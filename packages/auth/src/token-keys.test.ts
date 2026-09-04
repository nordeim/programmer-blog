/**
 * packages/auth/src/token-keys.test.ts — R-62 (Pass 6, M-46).
 *
 * Pins the documented key-separation contract (PRD FR-30/31, .env.example,
 * AGENTS.md): transaction tokens (subscribe confirm / unsubscribe) are
 * signed with `SIGNED_TOKEN_SECRET`, while session cookies stay keyed by
 * `BETTER_AUTH_SECRET`. Pre-R-62 every HMAC went through `getSecret()` —
 * i.e. `BETTER_AUTH_SECRET` — and `SIGNED_TOKEN_SECRET` was read by
 * nothing, so rotating it invalidated nothing.
 *
 * getSecret()/getTransactionSecret() read process.env on every call (no
 * caching), so mutating env inside a test is sufficient.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSessionToken, signToken, verifySessionToken, verifyToken } from './tokens';

const SESSION_A = 'a'.repeat(32);
const TXN_A = 'b'.repeat(32);
const TXN_B = 'c'.repeat(32);

beforeAll(() => {
  process.env.BETTER_AUTH_SECRET = SESSION_A;
  delete process.env.SIGNED_TOKEN_SECRET;
});

afterAll(() => {
  delete process.env.BETTER_AUTH_SECRET;
  delete process.env.SIGNED_TOKEN_SECRET;
});

describe('transaction-token key separation (R-62 / M-46)', () => {
  it('signToken falls back to the session secret when SIGNED_TOKEN_SECRET is unset', async () => {
    const t = await signToken('sub-1');
    expect(await verifyToken(t, 'sub-1')).toBe(true);
  });

  it('signToken keys on SIGNED_TOKEN_SECRET when set', async () => {
    process.env.SIGNED_TOKEN_SECRET = TXN_A;
    const t = await signToken('sub-2');
    expect(await verifyToken(t, 'sub-2')).toBe(true);
    delete process.env.SIGNED_TOKEN_SECRET;
  });

  it('rotating SIGNED_TOKEN_SECRET invalidates previously-issued transaction tokens', async () => {
    process.env.SIGNED_TOKEN_SECRET = TXN_A;
    const t = await signToken('sub-3');
    process.env.SIGNED_TOKEN_SECRET = TXN_B;
    expect(await verifyToken(t, 'sub-3')).toBe(false);
    // Re-issuing under the new key verifies.
    const t2 = await signToken('sub-3');
    expect(await verifyToken(t2, 'sub-3')).toBe(true);
    delete process.env.SIGNED_TOKEN_SECRET;
  });

  it('session tokens remain keyed by BETTER_AUTH_SECRET regardless of SIGNED_TOKEN_SECRET', async () => {
    process.env.SIGNED_TOKEN_SECRET = TXN_A;
    const t = await createSessionToken('user-1');
    expect(await verifySessionToken(t)).toBe('user-1');
    delete process.env.SIGNED_TOKEN_SECRET;
  });
});

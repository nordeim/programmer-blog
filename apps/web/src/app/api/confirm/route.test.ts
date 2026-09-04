/**
 * apps/web/src/app/api/confirm/route.test.ts — TDD RED+GREEN 6.1.
 *
 * Verifies:
 *   - missing token → 400
 *   - malformed token (no separator) → 400
 *   - tampered token → 400
 *   - valid token + unknown subscriber → 400 'unknown subscriber'
 *   - valid token + already-confirmed → 200 'already subscribed'
 *   - valid token + pending subscriber → 302 to /?subscribed=1 + DB updated
 *
 * @devlog/auth's verifyTransactionToken is mocked (R-80 purpose-tagged
 * contract) so we don't need real secrets.
 * The DB layer is mocked so no real SQLite is required.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const verifyTokenSpy = vi.fn();

const { mockDb, selectSpy, updateSpy } = vi.hoisted(() => {
  const selectSpy = vi.fn();
  const updateSpy = vi.fn();
  const limitChain = {
    all: () => selectSpy(),
    get: () => selectSpy(),
  };
  const whereChain = { limit: () => limitChain };
  const fromChain = { where: () => whereChain };
  const mockDb = {
    select: () => ({ from: () => fromChain }),
    update: () => ({
      set: (v: unknown) => {
        updateSpy(v);
        return { where: () => ({ run: () => undefined }) };
      },
    }),
  };
  return { mockDb, selectSpy, updateSpy };
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
  schema: {
    subscribers: {
      id: 'subscribers.id',
      status: 'subscribers.status',
      confirmedAt: 'subscribers.confirmedAt',
      email: 'subscribers.email',
    },
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

vi.mock('@devlog/auth', () => ({
  verifyTransactionToken: (...args: unknown[]) => verifyTokenSpy(...(args as never[])),
}));

import { GET } from './route';

function makeReq(url: string): Request {
  return new Request(url);
}

describe('GET /api/confirm', () => {
  beforeEach(() => {
    verifyTokenSpy.mockReset();
    selectSpy.mockReset();
    updateSpy.mockReset();
  });

  it('returns 400 when no token is provided', async () => {
    const res = await GET(makeReq('http://localhost:3000/api/confirm'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for a malformed token (no separator)', async () => {
    const res = await GET(makeReq('http://localhost:3000/api/confirm?token=garbage'));
    expect(res.status).toBe(400);
    expect((await res.text()).toLowerCase()).toContain('invalid');
  });

  it('returns 400 when verifyTransactionToken returns false', async () => {
    verifyTokenSpy.mockReturnValue(false);
    const res = await GET(
      makeReq('http://localhost:3000/api/confirm?token=sub-1.badhmac'),
    );
    expect(res.status).toBe(400);
    expect(verifyTokenSpy).toHaveBeenCalledWith('sub-1.badhmac', 'sub-1', 'confirm');
  });

  it('returns 400 when subscriber is not found', async () => {
    verifyTokenSpy.mockReturnValue(true);
    selectSpy.mockReturnValue([]);
    const res = await GET(
      makeReq('http://localhost:3000/api/confirm?token=sub-1.goodhmac'),
    );
    expect(res.status).toBe(400);
    expect((await res.text()).toLowerCase()).toContain('unknown');
  });

  it('returns 200 when subscriber is already confirmed', async () => {
    verifyTokenSpy.mockReturnValue(true);
    selectSpy.mockReturnValue([
      { id: 'sub-1', status: 'confirmed', email: 'a@b.com' },
    ]);
    const res = await GET(
      makeReq('http://localhost:3000/api/confirm?token=sub-1.goodhmac'),
    );
    expect(res.status).toBe(200);
    expect((await res.text()).toLowerCase()).toContain('already');
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('updates status to confirmed and redirects to /?subscribed=1', async () => {
    verifyTokenSpy.mockReturnValue(true);
    selectSpy.mockReturnValue([
      { id: 'sub-1', status: 'pending', email: 'a@b.com' },
    ]);
    const res = await GET(
      makeReq('http://localhost:3000/api/confirm?token=sub-1.goodhmac'),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('http://localhost:3000/?subscribed=1');
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed' }));
  });
});

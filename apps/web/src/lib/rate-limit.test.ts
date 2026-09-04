/**
 * apps/web/src/lib/rate-limit.test.ts — Phase 2 / Phase 4 tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetRateLimit, __rateLimitStoreSize, rateLimit } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    __resetRateLimit();
  });
  afterEach(() => {
    __resetRateLimit();
    vi.useRealTimers();
  });

  it('allows up to `max` calls within the window', async () => {
    expect(await rateLimit('ip:1', 3, 3600)).toBe(true);
    expect(await rateLimit('ip:1', 3, 3600)).toBe(true);
    expect(await rateLimit('ip:1', 3, 3600)).toBe(true);
    expect(await rateLimit('ip:1', 3, 3600)).toBe(false);
  });

  it('isolates by key', async () => {
    expect(await rateLimit('ip:1', 1, 3600)).toBe(true);
    expect(await rateLimit('ip:2', 1, 3600)).toBe(true);
    expect(await rateLimit('ip:1', 1, 3600)).toBe(false);
  });

  it('allows again after window elapses', async () => {
    vi.useFakeTimers();
    expect(await rateLimit('ip:x', 1, 1)).toBe(true);
    expect(await rateLimit('ip:x', 1, 1)).toBe(false);
    await vi.advanceTimersByTimeAsync(1500);
    expect(await rateLimit('ip:x', 1, 1)).toBe(true);
    vi.useRealTimers();
  });

  // R-59 (audit M-43): the store must not grow without bound. A slow
  // heap-exhaustion DoS previously created one permanent bucket per
  // spoofed key — the docstring even claimed eviction that did not exist.
  it('keeps the bucket count bounded (oldest keys evicted past the cap)', async () => {
    const CAP = 4; // small, deterministic cap for the test
    for (let i = 0; i < 25; i++) {
      await rateLimit(`burst:${i}`, 5, 3600, { maxBuckets: CAP });
    }
    expect(__rateLimitStoreSize()).toBe(CAP);
    // The oldest keys were evicted — re-checking burst:0 starts a fresh bucket.
    expect(await rateLimit('burst:0', 5, 3600, { maxBuckets: CAP })).toBe(true);
  });

  it('evicts idle single-entry buckets past twice the window', async () => {
    vi.useFakeTimers();
    await rateLimit('idle:1', 5, 10);
    expect(__rateLimitStoreSize()).toBe(1);
    await vi.advanceTimersByTimeAsync(21_000);
    await rateLimit('idle:2', 5, 10);
    // idle:1's only hit is stale past 2×window → swept on the next call.
    expect(__rateLimitStoreSize()).toBe(1);
    vi.useRealTimers();
  });
});

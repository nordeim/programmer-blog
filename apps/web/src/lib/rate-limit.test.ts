/**
 * apps/web/src/lib/rate-limit.test.ts — Phase 2 / Phase 4 tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetRateLimit, rateLimit } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    __resetRateLimit();
  });
  afterEach(() => {
    __resetRateLimit();
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
});

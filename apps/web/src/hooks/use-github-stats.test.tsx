/**
 * apps/web/src/hooks/use-github-stats.test.tsx — Phase 3 tests for useGitHubStats.
 *
 * Tests:
 *   1. Initial values pass through when poll=false.
 *   2. Fetches `/api/github-stats` on mount (when poll=true).
 *   3. Falls back to current value on 4xx.
 *   4. Simulates +1 every 9s.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useGitHubStats } from './use-github-stats';

describe('useGitHubStats', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initial values pass through', () => {
    const { result } = renderHook(() =>
      useGitHubStats({ initialStars: 100, initialForks: 50, poll: false }),
    );
    expect(result.current.stars).toBe(100);
    expect(result.current.forks).toBe(50);
  });

  it('fetches /api/github-stats on mount', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ stars: 200, forks: 75 }), { status: 200 }),
      );
    renderHook(() =>
      useGitHubStats({ initialStars: 100, initialForks: 50, poll: true }),
    );
    // Let the fetch microtask resolve.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(fetchSpy).toHaveBeenCalledWith('/api/github-stats', { cache: 'no-store' });
  });

  it('simulates +1 every 9s after fetch settles', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ stars: 100, forks: 50 }), { status: 200 }),
    );
    const { result } = renderHook(() =>
      useGitHubStats({ initialStars: 100, initialForks: 50, poll: true }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current.stars).toBe(100);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9500);
    });
    expect(result.current.stars).toBe(101);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(result.current.stars).toBe(102);
  });

  it('falls back to initial values on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() =>
      useGitHubStats({ initialStars: 999, initialForks: 888, poll: true }),
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(result.current.stars).toBe(999);
    expect(result.current.forks).toBe(888);
  });
});

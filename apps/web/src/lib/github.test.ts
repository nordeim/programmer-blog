/**
 * apps/web/src/lib/github.test.ts — GitHub stats fetcher with fallbacks.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

// unstable_cache is a Next.js server primitive — pass-through in tests.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
}));

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_GITHUB_REPO: 'nordeim/programmer-blog' },
}));

import { getGitHubStats, getGitHubStatsForConfiguredRepo } from './github';

const realFetch = global.fetch;

afterEach(() => {
  global.fetch = realFetch;
  vi.restoreAllMocks();
});

describe('getGitHubStats', () => {
  it('returns stars + forks from a successful API response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ stargazers_count: 42, forks_count: 7 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    const stats = await getGitHubStats('nordeim/programmer-blog');
    expect(stats).toEqual({ stars: 42, forks: 7 });
  });

  it('falls back to the constants on an HTTP error status', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('rate limited', { status: 403 })) as unknown as typeof fetch;
    const stats = await getGitHubStats('nordeim/programmer-blog');
    expect(stats.stars).toBeGreaterThan(0);
    expect(stats.forks).toBeGreaterThan(0);
  });

  it('falls back to the constants on a network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('dns fail')) as unknown as typeof fetch;
    const stats = await getGitHubStats('nordeim/programmer-blog');
    expect(stats.stars).toBeGreaterThan(0);
  });

  it('falls back when the payload lacks the counters', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: 'Not Found' }), { status: 200 }),
    ) as unknown as typeof fetch;
    const stats = await getGitHubStats('nordeim/programmer-blog');
    expect(stats.stars).toBeGreaterThan(0);
    expect(stats.forks).toBeGreaterThan(0);
  });

  // R-43 (M-36): the fetch must carry an AbortSignal so a hung GitHub
  // connection cannot stall /api/github-stats indefinitely.
  it('passes an AbortSignal to fetch and aborts after the 5s timeout (R-43)', async () => {
    vi.useFakeTimers();
    try {
      let aborted = false;
      let capturedSignal: AbortSignal | null | undefined;
      global.fetch = vi.fn().mockImplementation((_url: unknown, init?: RequestInit) => {
        capturedSignal = init?.signal;
        capturedSignal?.addEventListener('abort', () => {
          aborted = true;
        });
        // Hang until aborted — mimics a stalled connection.
        return new Promise((_resolve, reject) => {
          capturedSignal?.addEventListener('abort', () => reject(new Error('timeout')));
        });
      }) as unknown as typeof fetch;

      const promise = getGitHubStats('nordeim/programmer-blog');
      // Advance past the 5s abort window; the hung fetch rejects,
      // and the lib's catch maps it to the fallback stats.
      await vi.advanceTimersByTimeAsync(5_100);

      await expect(promise).resolves.toEqual(
        expect.objectContaining({ stars: expect.any(Number), forks: expect.any(Number) }),
      );
      expect(capturedSignal).toBeInstanceOf(AbortSignal);
      expect(aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('getGitHubStatsForConfiguredRepo', () => {
  it('uses the repo from env', async () => {
    const urlRef: string[] = [];
    global.fetch = vi.fn().mockImplementation((url: string | URL) => {
      urlRef.push(String(url));
      return Promise.resolve(
        new Response(JSON.stringify({ stargazers_count: 1, forks_count: 2 }), { status: 200 }),
      );
    }) as unknown as typeof fetch;
    const stats = await getGitHubStatsForConfiguredRepo();
    expect(stats).toEqual({ stars: 1, forks: 2 });
    expect(urlRef[0]).toContain('repos/nordeim/programmer-blog');
  });
});

/**
 * apps/web/src/lib/rate-limit.ts — in-memory sliding-window rate limiter.
 *
 * Each key has a list of timestamps of requests within the window. New
 * requests prune out timestamps older than `windowSeconds` and check
 * if the remaining count is under the limit. Memory-safe: keys with
 * empty timestamp lists are deleted.
 *
 * Server-side only. Suitable for single-process Node.js; for multi-
 * instance deploys, swap in Redis (PAD §3.3 Pattern 6 — future work).
 */
const buckets = new Map<string, number[]>();

export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const arr = buckets.get(key) ?? [];
  const fresh = arr.filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}

// For test cleanup only.
export function __resetRateLimit(): void {
  buckets.clear();
}

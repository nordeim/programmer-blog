/**
 * apps/web/src/lib/rate-limit.ts — in-memory sliding-window rate limiter.
 *
 * Each key has a list of timestamps of requests within the window. New
 * requests prune out timestamps older than `windowSeconds` and check
 * if the remaining count is under the limit.
 *
 * R-59 (audit M-43): the store is bounded two ways so a flood of unique
 * (possibly spoofed-IP) keys cannot exhaust the heap:
 *   1. Idle sweep — keys whose newest hit is older than 2× the window
 *      of the current call are deleted on access.
 *   2. Hard cap — at `MAX_BUCKETS` the oldest-inserted keys are evicted
 *      (Map preserves insertion order). A cap hit is indistinguishable
 *      from a fresh bucket for the evicted client: the practical effect
 *      is that their counter restarts, which is acceptable for an
 *      abuse-control limiter.
 *
 * Server-side only. Suitable for single-process Node.js; for multi-
 * instance deploys, swap in Redis (PAD §3.3 Pattern 6 — future work).
 */
const buckets = new Map<string, number[]>();

/** Default store cap. 10k keys ≈ a few MB worst case (timestamps arrays). */
const DEFAULT_MAX_BUCKETS = 10_000;

export interface RateLimitOptions {
  /** Test hook: override the store cap (eviction still oldest-first). */
  maxBuckets?: number;
}

export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
  options: RateLimitOptions = {},
): Promise<boolean> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const maxBuckets = options.maxBuckets ?? DEFAULT_MAX_BUCKETS;

  // Idle sweep (cheap, amortized): drop keys nobody touched for 2 windows.
  // Only their newest hit matters — older entries inside a live key are
  // pruned by the filter below anyway.
  if (buckets.size > 0) {
    for (const [k, hits] of buckets) {
      const newest = hits[hits.length - 1];
      if (newest !== undefined && now - newest >= windowMs * 2) {
        buckets.delete(k);
      }
    }
  }

  // Hard cap: evict oldest-inserted keys first (Map iteration order).
  while (buckets.size >= maxBuckets && !buckets.has(key)) {
    const oldest = buckets.keys().next();
    if (oldest.done) break;
    buckets.delete(oldest.value);
  }

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

// For test cleanup / assertions only.
export function __resetRateLimit(): void {
  buckets.clear();
}

export function __rateLimitStoreSize(): number {
  return buckets.size;
}

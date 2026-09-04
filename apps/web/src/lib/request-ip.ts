/**
 * apps/web/src/lib/request-ip.ts — derive the real client IP from proxy
 * headers (R-40, audit H-35).
 *
 * Server Actions run behind a reverse proxy in every real deployment, so
 * the originating client IP arrives in `x-forwarded-for` (possibly a
 * comma-separated chain) or `x-real-ip`. Reading it server-side lets the
 * rate limiters key on the actual requester — the previous pattern keyed
 * comments on the postId when no IP was passed, putting every visitor of
 * a post into one shared 10/hour bucket.
 *
 * The value is advisory (rate-limit keys only) — never trust it for
 * authorization or audit logging, since headers are client-forgeable
 * before the proxy overwrites them.
 */

/** Structural subset of Next's ReadonlyHeaders — keeps this pure and testable. */
interface HeaderGetter {
  get(name: string): string | null;
}

export function getClientIpFromHeaders(headersList: HeaderGetter): string {
  // x-forwarded-for is the standard header from reverse proxies (Vercel,
  // nginx, etc.). It may contain a comma-separated list; the first
  // entry is the originating client.
  const xff = headersList.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  // Fallback to x-real-ip (some proxies set this).
  const xRealIp = headersList.get('x-real-ip');
  if (xRealIp) {
    const trimmed = xRealIp.trim();
    if (trimmed) return trimmed;
  }
  return 'unknown';
}

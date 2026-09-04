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
  // nginx, Cloudflare, …). It may contain a comma-separated chain, and
  // appending proxies put the proxy-observed client LAST. R-76 (Pass 7,
  // M-50): the rightmost entry is the only hop we did not receive
  // verbatim from the client, so it is the best available rate-limit key.
  // (Taking the first entry trusted whatever the client sent — every
  // per-IP limit was bypassable by rotating a fake XFF.)
  const xff = headersList.get('x-forwarded-for');
  if (xff) {
    const entries = xff
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    const last = entries.at(-1);
    if (last) return last;
  }
  // Fallback to x-real-ip (some proxies set this).
  const xRealIp = headersList.get('x-real-ip');
  if (xRealIp) {
    const trimmed = xRealIp.trim();
    if (trimmed) return trimmed;
  }
  return 'unknown';
}

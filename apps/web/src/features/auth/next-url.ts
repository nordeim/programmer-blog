/**
 * apps/web/src/features/auth/next-url.ts — R-60 (Pass 6, M-44).
 *
 * The single guard for `/admin/login?next=` redirect targets. Consumed
 * by BOTH the sign-in action (`features/auth/actions.ts`) and the login
 * page (`app/(auth)/admin/login/page.tsx`) — previously only the action
 * sanitized `next`, so an already-authenticated author visiting
 * `/admin/login?next=https://evil.com` was redirected off-site.
 *
 * Plain module (no `'use server'`) so both a server action and a server
 * component can import it.
 */

const ALLOWED_NEXT_PREFIX = '/admin';
const FALLBACK_NEXT = '/admin';

export function safeNext(next: string | undefined | null): string {
  if (!next) return FALLBACK_NEXT;
  // Reject absolute URLs, any scheme, protocol-relative targets, and the
  // backslash variants parsers have historically treated as `//`.
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|\\\\|\/\\|\\\/)/i.test(next)) return FALLBACK_NEXT;
  // Only in-app /admin paths are meaningful post-login targets.
  if (!next.startsWith(ALLOWED_NEXT_PREFIX)) return FALLBACK_NEXT;
  // Header-splitting / traversal paranoia: no backslashes, no control
  // characters, no dot-segment traversal.
  if (next.includes('\\') || /[\r\n\t]/.test(next) || next.includes('..')) {
    return FALLBACK_NEXT;
  }
  return next;
}

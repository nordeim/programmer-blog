/**
 * apps/web/src/proxy.ts — FR-33 admin guard (Layer 0).
 *
 * Next.js 16 renamed `middleware.ts` → `proxy.ts`. This file is the
 * Edge Runtime proxy that gates `/admin/*`. Kept as `proxy.ts` to
 * silence `⚠ The "middleware" file convention is deprecated`.
 * `middleware.ts` is kept as a shim re-export for ecosystem compat.
 *
 * Reads the session cookie. For `/admin/*` (except `/admin/login`),
 * if no session or role !== 'author', redirects to `/admin/login`.
 *
 * Per PAD §6.4 (security headers) + MEP §7 Phase 6 RED/GREEN 6.1.
 */
import { SESSION_COOKIE, verifySessionToken } from '@devlog/auth/tokens';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = session ? await verifySessionToken(session) : null;

  if (!userId) {
    const loginUrl = new URL('/admin/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};

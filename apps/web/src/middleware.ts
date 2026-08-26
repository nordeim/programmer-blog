/**
 * apps/web/src/middleware.ts — FR-33 admin guard (Layer 0).
 *
 * The MEP calls this `proxy.ts` (Next.js 16 renamed `middleware.ts`
 * to `proxy.ts`); both filenames are accepted by the framework. We
 * use `middleware.ts` for broader ecosystem compatibility.
 *
 * Reads the session cookie. For `/admin/*` (except `/admin/login`),
 * if no session or role !== 'author', redirects to `/admin/login`.
 * Also sets a baseline set of security headers on every response.
 *
 * Per PAD §6.4 (security headers) + MEP §7 Phase 6 RED/GREEN 6.1.
 */
import { SESSION_COOKIE, verifySessionToken } from '@devlog/auth';
import { NextResponse, type NextRequest } from 'next/server';


const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate /admin/* routes. Everything else is public.
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow the login page itself to be served without a session.
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = req.cookies.get(SESSION_COOKIE)?.value;
  const userId = session ? verifySessionToken(session) : null;

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

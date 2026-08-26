/**
 * apps/web/src/app/(auth)/admin/layout.tsx — admin shell.
 *
 * Wraps every `/admin/*` page (except `/admin/login`, which the
 * middleware allows through unauthenticated). Sidebar with:
 * Dashboard, Posts, Subscribers, Comments, Settings, Sign out.
 *
 * The login page bypasses this layout because it's mounted under
 * `/admin/login` while this layout applies to the (auth) route
 * group. The login page lives under `(auth)/admin/login` and the
 * rest live under `(auth)/admin/...` — both share this layout.
 * For the login page specifically, the sidebar is hidden via a
 * prop check on pathname (we read it from `headers()`).
 *
 * Source: MEP §7 Phase 6 GREEN 6.4 #2.
 */
import Link from 'next/link';

import { SignOutButton } from '@/features/auth/sign-out-button';
import { getSession } from '@/lib/auth';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/posts', label: 'Posts' },
  { href: '/admin/subscribers', label: 'Subscribers' },
  { href: '/admin/comments', label: 'Comments' },
  { href: '/admin/settings', label: 'Settings' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Login page bypasses the shell via route group nesting.
  // We detect it by checking the headers' pathname.
  const headers = await import('next/headers').then((m) => m.headers());
  const pathname = headers.get('x-pathname') ?? '';
  if (pathname === '/admin/login' || pathname.endsWith('/admin/login')) {
    // Strip the shell on the login page; just render the children.
    return <>{children}</>;
  }

  const jar = (await import('next/headers').then((m) => m.cookies()));
  const user = await getSession(jar.get('devlog_session')?.value);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside
        className="md:w-64 border-b md:border-b-0 md:border-r border-[var(--border)] py-6 px-4 md:py-12"
        style={{ background: 'var(--bg-elev)' }}
        aria-label="Admin navigation"
      >
        <div className="font-mono text-xs uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>
          {'//'} /dev/log
        </div>
        <nav className="flex md:flex-col gap-3 md:gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-mono text-sm px-2 py-1 hover:text-[var(--accent)] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 md:mt-12 md:pt-6 md:border-t border-[var(--border)]">
          <SignOutButton />
          {user ? (
            <div className="font-mono text-xs mt-3" style={{ color: 'var(--muted)' }}>
              signed in as {user.email}
            </div>
          ) : null}
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-12" data-testid="admin-main">
        {children}
      </main>
    </div>
  );
}

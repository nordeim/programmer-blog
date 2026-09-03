/**
 * apps/web/src/app/(auth)/admin/(dashboard)/layout.tsx — admin shell.
 *
 * R-31 (Pass 3): this guarded shell lives inside the `(dashboard)` route
 * group, so it wraps ONLY the authenticated admin pages (`/admin`,
 * `/admin/posts/*`, `/admin/subscribers/*`, `/admin/comments/*`,
 * `/admin/settings/*`). The login page (`(auth)/admin/login/`) sits
 * OUTSIDE the group and never passes through here — URLs are unchanged
 * (route groups don't affect paths).
 *
 * History: the pre-R-31 monolithic layout wrapped ALL of `/admin/*`
 * including `/admin/login` and tried to detect the login page via a
 * `x-pathname` request header — a header nothing ever set — so anonymous
 * `/admin/login` visits ran `requireAuthor(undefined)` →
 * `redirect('/admin/login?next=/admin')` forever (C-31:
 * ERR_TOO_MANY_REDIRECTS in production).
 *
 * R-6 (audit remediation): enforces `role === 'author'` at the page-shell
 * layer. The edge `proxy.ts` only verifies the session token's HMAC
 * signature — it cannot check the role because the DB-backed user lookup
 * is not Edge-runtime-safe. This layout calls `requireAuthor()` (which
 * throws `AuthorRequiredError` for any missing/invalid session or
 * non-author role) and redirects to the login page on rejection.
 *
 * Sidebar: Dashboard, Posts, Subscribers, Comments, Settings, Sign out.
 *
 * Source: MEP §7 Phase 6 GREEN 6.4 #2 + R-6 + R-31.
 */
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { SignOutButton } from '@/features/auth/sign-out-button';
import { isAuthorRequiredError, requireAuthor, SESSION_COOKIE } from '@/lib/auth';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/posts', label: 'Posts' },
  { href: '/admin/subscribers', label: 'Subscribers' },
  { href: '/admin/comments', label: 'Comments' },
  { href: '/admin/settings', label: 'Settings' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await import('next/headers').then((m) => m.cookies());
  // R-31/M-33: use the exported SESSION_COOKIE constant, not a hardcoded name.
  const cookieValue = jar.get(SESSION_COOKIE)?.value;
  let user: Awaited<ReturnType<typeof requireAuthor>>;
  try {
    user = await requireAuthor(cookieValue);
  } catch (e) {
    if (isAuthorRequiredError(e)) {
      redirect(`/admin/login?next=${encodeURIComponent('/admin')}`);
    }
    throw e;
  }

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

/**
 * apps/web/src/app/(auth)/admin/login/page.tsx — FR-33.
 *
 * Server component. Renders the admin login page. The actual form
 * is the `<LoginForm>` client component; the page wraps it in the
 * branded CLI aesthetic.
 *
 * If the user already has a valid session, redirect to `/admin`
 * (via the `next` search param if present).
 *
 * Source: MEP §7 Phase 6 RED/GREEN 6.4.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { LoginForm } from '@/features/auth/login-form';
import { getSession, SESSION_COOKIE } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Admin sign in — /dev/log',
  description: 'Sign in to the /dev/log admin surface.',
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;
  const next = sp.next ?? '/admin';

  // If the user already has a valid session, redirect to `next`.
  // R-31/M-33: use the exported SESSION_COOKIE constant (was hardcoded).
  const jar = await import('next/headers').then((m) => m.cookies());
  const existing = jar.get(SESSION_COOKIE)?.value;
  const user = await getSession(existing);
  if (user && user.role === 'author') {
    // We can't call redirect() in a try/catch cleanly here, but Next.js
    // handles the RSC redirect when we throw a NEXT_REDIRECT.
    const { redirect } = await import('next/navigation');
    redirect(next);
  }

  return (
    <section className="py-24 md:py-32 px-6 min-h-[60vh] flex items-center" data-testid="login-page">
      <div className="max-w-3xl mx-auto w-full">
        <Link href="/" className="hover-link font-mono text-xs" style={{ color: 'var(--muted)' }}>
          ← back to /dev/log
        </Link>
        <div
          className="font-mono text-xs uppercase tracking-widest mt-8 mb-4"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} admin / sign in
        </div>
        <h1
          className="font-display font-black text-4xl md:text-6xl mb-12"
          style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
        >
          sign <span style={{ fontStyle: 'italic', fontWeight: 400 }}>in</span>
        </h1>
        <LoginForm nextHref={next} />
        {/*
         * R-37 (C-35): the seeded dev credentials must NEVER render in a
         * production deployment — the hint is a dev convenience only.
         * Production silence mirrors the R-5 secret policy.
         */}
        {process.env.NODE_ENV === 'development' && (
          <p
            className="font-mono text-xs mt-12"
            style={{ color: 'var(--muted)' }}
          >
            $ dev credentials — <code>author@devlog.example</code> /{' '}
            <code>dev-password-12345</code> (set by the seed script; override
            with the <code>DEV_AUTHOR_PASSWORD</code> env var).
          </p>
        )}
      </div>
    </section>
  );
}

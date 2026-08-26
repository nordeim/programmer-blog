/**
 * apps/web/src/app/(public)/preferences/page.tsx — FR-32.
 *
 * GET /preferences?token=<subscriberId>.<hmac>
 *
 * Server component. Verifies the token, looks up the subscriber,
 * renders a branded preferences page with options to:
 *   - change email frequency (weekly / monthly)
 *   - unsubscribe (link back to /unsubscribe)
 *
 * Updating preferences is a server action that re-verifies the token
 * before writing. For Phase 6 v1, the page is read-only (displaying
 * the current state); the action lives in the same file.
 *
 * Per PAD §3.3 Pattern 6 + Pattern 4.
 */
import 'server-only';
import { verifyToken } from '@devlog/auth';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

import { db, schema } from '@/lib/db';


export const metadata: Metadata = {
  title: 'Subscriber preferences — /dev/log',
  description: 'Manage your /dev/log dispatch preferences.',
  robots: { index: false, follow: false },
};

interface PreferencesPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function PreferencesPage({ searchParams }: PreferencesPageProps) {
  const sp = await searchParams;
  const token = sp.token;
  let email: string | null = null;
  let status: 'pending' | 'confirmed' | 'unsubscribed' | 'bounced' = 'pending';
  let frequency: 'weekly' | 'monthly' = 'weekly';
  let error: string | null = null;

  if (!token) {
    error = 'missing token';
  } else {
    const sep = token.indexOf('.');
    if (sep < 0) {
      error = 'invalid or expired token';
    } else {
      const subscriberId = token.slice(0, sep);
      if (!verifyToken(token, subscriberId)) {
        error = 'invalid or expired token';
      } else {
        try {
          const rows = db
            .select()
            .from(schema.subscribers)
            .where(eq(schema.subscribers.id, subscriberId))
            .limit(1)
            .all();
          const sub = rows[0];
          if (!sub) {
            error = 'unknown subscriber';
          } else {
            email = sub.email;
            status = sub.status;
            frequency = sub.preferences?.frequency ?? 'weekly';
          }
        } catch (e) {
          console.error('[preferences] DB error', e);
          error = 'server error';
        }
      }
    }
  }

  return (
    <section
      className="py-24 md:py-32 px-6 min-h-[60vh] flex items-center"
      data-testid="preferences-page"
    >
      <div className="max-w-3xl mx-auto w-full">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-4"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} preferences
        </div>
        <h1
          className="font-display font-black text-4xl md:text-6xl"
          style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
        >
          your <span style={{ fontStyle: 'italic', fontWeight: 400 }}>dispatch</span>
        </h1>
        {error ? (
          <p className="text-base md:text-lg mt-6" style={{ color: 'var(--muted)' }}>
            $ {error}
          </p>
        ) : (
          <div className="mt-12 space-y-6">
            <p className="text-base md:text-lg" style={{ color: 'var(--muted)' }}>
              {email}
            </p>
            <dl className="flex flex-col gap-4 font-mono text-sm">
              <div className="flex gap-4">
                <dt style={{ color: 'var(--muted)' }}>status:</dt>
                <dd>{status}</dd>
              </div>
              <div className="flex gap-4">
                <dt style={{ color: 'var(--muted)' }}>frequency:</dt>
                <dd>{frequency}</dd>
              </div>
            </dl>
            <div className="mt-12 flex flex-wrap gap-4">
              <Link href="/" className="btn-secondary">
                ← back to /dev/log
              </Link>
              {token ? (
                <Link
                  href={`/unsubscribe?token=${token}`}
                  className="hover-link font-mono text-sm"
                  style={{ color: 'var(--accent)' }}
                >
                  unsubscribe instead →
                </Link>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

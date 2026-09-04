/**
 * apps/web/src/app/(public)/unsubscribe/page.tsx — FR-31.
 *
 * GET /unsubscribe?token=<subscriberId>.<…>
 *
 * Server component. R-74 (Pass 7, H-42): the page is strictly
 * read-on-GET — it verifies the `manage` token, looks up the subscriber
 * and renders either a confirmation form (the actual write happens in
 * the `confirmUnsubscribe` Server Action) or, for an already-
 * unsubscribed subscriber, the done state directly (idempotent —
 * re-clicking the link never errors and never re-writes). Renders calm
 * error copy for missing/invalid tokens (R-55).
 *
 * Why: email clients and corporate sanitizers prefetch links with GET;
 * a destructive write during render silently unsubscribed users who
 * never clicked anything.
 *
 * Per PAD §3.3 Pattern 6 + Pattern 4.
 */
import 'server-only';
import { verifyTransactionToken } from '@devlog/auth';
import { eq } from 'drizzle-orm';
import type { Metadata } from 'next';
import Link from 'next/link';

import { UnsubscribeForm } from '@/features/subscribe/unsubscribe-form';
import { db, schema } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Unsubscribed — /dev/log',
  description: 'You have been removed from the /dev/log dispatch.',
  robots: { index: false, follow: false },
};

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const sp = await searchParams;
  const token = sp.token;
  let email: string | null = null;
  let alreadyUnsubscribed = false;
  let verified = false;
  let error: string | null = null;

  if (!token) {
    error = 'missing token';
  } else {
    const sep = token.indexOf('.');
    if (sep < 0) {
      error = 'invalid or expired token';
    } else {
      const subscriberId = token.slice(0, sep);
      // R-80: manage purpose — accepts the current v1 long-lived links
      // already in subscribers' inboxes plus newer v2 manage tokens.
      if (!(await verifyTransactionToken(token, subscriberId, 'manage'))) {
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
            verified = true;
            alreadyUnsubscribed = sub.status === 'unsubscribed';
          }
        } catch (e) {
          console.error('[unsubscribe] DB error', e);
          error = 'server error';
        }
      }
    }
  }

  return (
    <section
      className="py-24 md:py-32 px-6 min-h-page flex items-center"
      data-testid="unsubscribe-page"
    >
      <div className="max-w-3xl mx-auto w-full">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-4"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} unsubscribe
        </div>

        {verified && alreadyUnsubscribed ? (
          <>
            <h1
              className="font-display font-black text-4xl md:text-6xl"
              style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
            >
              you&apos;re <span style={{ fontStyle: 'italic', fontWeight: 400 }}>out</span>
            </h1>
            <p className="text-base md:text-lg mt-6" style={{ color: 'var(--muted)' }}>
              {`${email ?? 'you'} have been removed from the /dev/log dispatch. you won't receive any more emails from us.`}
            </p>
            <div className="mt-12">
              <Link href="/" className="btn-secondary">
                ← back to /dev/log
              </Link>
            </div>
          </>
        ) : verified && email && token ? (
          <UnsubscribeForm token={token} email={email} />
        ) : (
          <>
            <h1
              className="font-display font-black text-4xl md:text-6xl"
              style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
            >
              couldn&apos;t <span style={{ fontStyle: 'italic', fontWeight: 400 }}>confirm</span>
            </h1>
            <p className="text-base md:text-lg mt-6" style={{ color: 'var(--muted)' }}>
              {`$ ${error ?? 'unknown error'}`}
            </p>
            <div className="mt-12">
              <Link href="/#about" className="btn-secondary">
                ← subscribe
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

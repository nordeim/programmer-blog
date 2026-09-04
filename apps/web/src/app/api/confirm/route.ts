/**
 * apps/web/src/app/api/confirm/route.ts — FR-30.
 *
 * GET /api/confirm?token=<subscriberId>.<hmac>
 *
 * Verifies the signed token, looks up the subscriber, updates the
 * status to `confirmed` + sets `confirmedAt = now`. Redirects to
 * `/?subscribed=1` on success so the landing can show a welcome toast.
 *
 * On invalid token: 400 'invalid or expired token'.
 * On unknown subscriber: 400 'unknown subscriber'.
 * On already-confirmed: 200 'already subscribed' (no DB write).
 *
 * Per PAD §3.3 Pattern 4 + Pattern 6 (signed token + idempotent write).
 */
import 'server-only';
import { verifyTransactionToken } from '@devlog/auth';
import { eq } from 'drizzle-orm';

import { db, schema } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

interface ConfirmRequest extends Request {
  nextUrl?: { searchParams: URLSearchParams };
}

export async function GET(req: ConfirmRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response('missing token', { status: 400 });
  }

  // Token format (R-80): v2 `<subscriberId>.<iat>.confirm.<hmac>` —
  // purpose-tagged with a server-enforced 7-day TTL. Legacy v1 tokens are
  // rejected here on purpose: they carry no expiry, so accepting them
  // would keep the replay-forever hole open.
  const sep = token.indexOf('.');
  if (sep < 0) {
    return new Response('invalid or expired token', { status: 400 });
  }
  const subscriberId = token.slice(0, sep);
  if (!(await verifyTransactionToken(token, subscriberId, 'confirm'))) {
    return new Response('invalid or expired token', { status: 400 });
  }

  try {
    const rows = db
      .select()
      .from(schema.subscribers)
      .where(eq(schema.subscribers.id, subscriberId))
      .limit(1)
      .all();
    const sub = rows[0];
    if (!sub) {
      return new Response('unknown subscriber', { status: 400 });
    }
    if (sub.status === 'confirmed') {
      return new Response('already subscribed', { status: 200 });
    }
    db.update(schema.subscribers)
      .set({ status: 'confirmed', confirmedAt: new Date() })
      .where(eq(schema.subscribers.id, subscriberId))
      .run();
    const redirectUrl = new URL(env.NEXT_PUBLIC_SITE_URL);
    redirectUrl.searchParams.set('subscribed', '1');
    return Response.redirect(redirectUrl, 302);
  } catch (e) {
    console.error('[confirm] DB error', e);
    return new Response('server error', { status: 500 });
  }
}

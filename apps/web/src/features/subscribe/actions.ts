/**
 * apps/web/src/features/subscribe/actions.ts — FR-12, FR-30.
 *
 * Server Action called by the landing page subscribe form. Validates
 * input with Zod, applies an in-memory rate limit, looks up the
 * subscriber by email to detect duplicates, generates a *signed*
 * confirmation token (so the /api/confirm, /unsubscribe, and
 * /preferences routes can verify it), inserts a `pending` subscriber,
 * and dispatches a Resend email via @devlog/email.
 *
 * R-3, R-4 (audit remediation): the previous implementation generated
 * `crypto.randomUUID()` for the confirm token and commented out the
 * `sendEmail` call — making the confirmation flow unreachable. We now
 * use `signToken(subscriberId)` (HMAC-SHA256) and actually send the
 * email. If Resend fails, the subscriber row is still created (Phase 6
 * cron would retry — currently not implemented; the toast tells the
 * user to check inbox).
 *
 * R-58 (audit H-39): the rate-limit key is derived ONLY from proxy
 * headers — the previous `ctx.ip` argument was attacker-serializable.
 *
 * Per PAD §3.3 Pattern 3 + Pattern 6 (signed token + idempotent write).
 */
'use server';

import 'server-only';

import { sendEmail } from '@devlog/email';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';

import { createTransactionToken, signToken, verifyTransactionToken } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { env } from '@/lib/env';
import { maskEmail } from '@/lib/log';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIpFromHeaders } from '@/lib/request-ip';

import { subscribeInputSchema, type SubscribeResult } from './schema';

const SUBSCRIBE_RATE_LIMIT_PER_HOUR = 5;
const SUBSCRIBE_SUBJECT = 'confirm your /dev/log subscription';

export async function subscribeToNewsletter(input: unknown): Promise<SubscribeResult> {
  // Validate input.
  const parsed = subscribeInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Invalid email.',
      fieldErrors: {
        email: parsed.error.issues[0]?.message ?? 'Invalid email.',
      },
    };
  }
  const email = parsed.data.email.toLowerCase();

  // Rate limit by the REAL client IP (R-40, H-35; R-58, H-39), read
  // server-side from proxy headers ONLY — the previous `ctx.ip` argument
  // was attacker-serializable. Falls back to the email only when no proxy
  // headers exist. Previously this always keyed on email despite being
  // documented as per-IP.
  const headersList = await headers();
  const clientIp = getClientIpFromHeaders(headersList);
  const key = clientIp === 'unknown' ? email : clientIp;
  const allowed = await rateLimit(`subscribe:${key}`, SUBSCRIBE_RATE_LIMIT_PER_HOUR, 3600);
  if (!allowed) {
    return {
      ok: false,
      error: 'Too many subscribe requests. Try again later.',
    };
  }

  // Idempotency: if this email is already subscribed (any status), short-circuit.
  try {
    const existing = await db
      .select()
      .from(schema.subscribers)
      .where(eq(schema.subscribers.email, email))
      .limit(1)
      .all();
    if (existing.length > 0) {
      const row = existing[0];
      if (row && row.status === 'confirmed') {
        return {
          ok: true,
          alreadySubscribed: true,
          message: "You're already subscribed. Welcome back.",
        };
      }
      // Pending / unsubscribed / bounced: re-issue a confirmation.
      // For simplicity in v1, just tell them they're already on the list.
      return {
        ok: true,
        alreadySubscribed: true,
        message: "You're already on the list. Check your inbox for the confirmation.",
      };
    }

    // Insert pending subscriber FIRST so we can get the row ID.
    // The confirm token is the signed form of the row ID, so it must
    // be generated AFTER the insert returns the ID.
    const insertResult = await db
      .insert(schema.subscribers)
      .values({
        email,
        status: 'pending',
        confirmToken: 'pending', // overwritten below
      })
      .returning({ id: schema.subscribers.id })
      .get();
    const subscriberId = insertResult?.id;
    if (!subscriberId) {
      return { ok: false, error: 'Server error. Please try again later.' };
    }

    // R-4: generate SIGNED tokens. R-80 (Pass 7, M-54): the confirm link
    // is now a v2 purpose-tagged token with a server-enforced 7-day TTL
    // (the email copy finally matches reality); the unsubscribe/preference
    // links keep the long-lived v1 format so older inbox links and the
    // manage routes' legacy-accept contract stay intact.
    // The /api/confirm route calls verifyTransactionToken(…, 'confirm');
    // /unsubscribe and /preferences call verifyTransactionToken(…, 'manage').
    const confirmToken = await createTransactionToken(subscriberId, 'confirm');
    const manageToken = await signToken(subscriberId);

    // Persist the signed token so the route can look it up if needed
    // (it currently re-derives from the URL, but storing keeps the
    // option open for token rotation / revocation).
    await db
      .update(schema.subscribers)
      .set({ confirmToken })
      .where(eq(schema.subscribers.id, subscriberId))
      .run();

    // Build the URLs the email templates render. Each purpose gets its
    // own credential (R-80): a leaked confirm link can no longer manage
    // the subscription, and vice versa.
    const base = env.NEXT_PUBLIC_SITE_URL;
    const confirmUrl = `${base}/api/confirm?token=${encodeURIComponent(confirmToken)}`;
    const unsubscribeUrl = `${base}/unsubscribe?token=${encodeURIComponent(manageToken)}`;

    // R-3: actually send the email. Best-effort — a Resend failure does
    // NOT fail the subscribe action (PRD §5.5: degrade gracefully).
    // The subscriber is already in `pending` status; a future cron retry
    // would re-send. For now we log the failure with a masked email.
    try {
      const result = await sendEmail({
        to: email,
        subject: SUBSCRIBE_SUBJECT,
        template: 'confirm-email',
        props: { email, confirmUrl, unsubscribeUrl },
      });
      if (!result.ok && !result.skipped) {
        // Real Resend error (not just dev-no-key). Log + continue.
        console.error(
          '[subscribe] Resend failed — subscriber created anyway',
          { email: maskEmail(email), error: result.error },
        );
      }
    } catch (e) {
      console.error(
        '[subscribe] sendEmail threw — subscriber created anyway',
        { email: maskEmail(email), error: e instanceof Error ? e.message : String(e) },
      );
    }

    return {
      ok: true,
      message: 'Welcome aboard. Confirmation pending in your inbox.',
    };
  } catch (e) {
    console.error('[subscribe] DB error', maskEmail(email), e);
    return { ok: false, error: 'Server error. Please try again later.' };
  }
}

/**
 * R-74 (Pass 7, H-42): the destructive half of the unsubscribe flow.
 *
 * The /unsubscribe page previously wrote the DB during the GET render —
 * email-client prefetch silently unsubscribed users who never clicked.
 * The GET now renders a confirmation form only; this Server Action
 * (POST via the form) performs the write. Token-gated with the
 * `manage` purpose (v2 + legacy v1 links both accepted, see R-80) and
 * idempotent: confirming twice, or confirming after prefetch, stays
 * "ok" with no second write.
 */
export async function confirmUnsubscribe(
  input: unknown,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const parsed = z.object({ token: z.string().min(1) }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'missing token' };
  }
  const token = parsed.data.token;

  const sep = token.indexOf('.');
  if (sep < 0) {
    return { ok: false, error: 'invalid or expired token' };
  }
  const subscriberId = token.slice(0, sep);
  const verified = await verifyTransactionToken(token, subscriberId, 'manage');
  if (!verified) {
    return { ok: false, error: 'invalid or expired token' };
  }

  // Defensive rate limit — the token is the real gate here, so the
  // shared-IP fallback bucket cannot lock a legitimate user out.
  const headersList = await headers();
  const clientIp = getClientIpFromHeaders(headersList);
  await rateLimit(`unsubscribe:${clientIp}`, 30, 3600);

  try {
    const rows = db
      .select()
      .from(schema.subscribers)
      .where(eq(schema.subscribers.id, subscriberId))
      .limit(1)
      .all();
    const sub = rows[0];
    if (!sub) {
      return { ok: false, error: 'unknown subscriber' };
    }
    if (sub.status !== 'unsubscribed') {
      db.update(schema.subscribers)
        .set({ status: 'unsubscribed', unsubscribedAt: new Date() })
        .where(eq(schema.subscribers.id, subscriberId))
        .run();
    }
    return { ok: true, message: "you're out." };
  } catch (e) {
    console.error('[unsubscribe] DB error', e);
    return { ok: false, error: 'server error' };
  }
}

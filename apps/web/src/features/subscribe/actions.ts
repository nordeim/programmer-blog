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
 * Per PAD §3.3 Pattern 3 + Pattern 6 (signed token + idempotent write).
 */
'use server';

import 'server-only';

import { sendEmail } from '@devlog/email';
import { eq } from 'drizzle-orm';


import { signToken } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { env } from '@/lib/env';
import { maskEmail } from '@/lib/log';
import { rateLimit } from '@/lib/rate-limit';

import { subscribeInputSchema, type SubscribeResult } from './schema';

const SUBSCRIBE_RATE_LIMIT_PER_HOUR = 5;
const SUBSCRIBE_SUBJECT = 'confirm your /dev/log subscription';

export async function subscribeToNewsletter(
  input: unknown,
  ctx: { ip?: string } = {},
): Promise<SubscribeResult> {
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

  // Rate limit by IP (or by email if IP missing).
  const key = ctx.ip ?? email;
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

    // R-4: generate a SIGNED token (format: <subscriberId>.<hmac>).
    // The /api/confirm, /unsubscribe, and /preferences routes call
    // verifyToken(token, subscriberId) — they expect this format.
    const confirmToken = await signToken(subscriberId);

    // Persist the signed token so the route can look it up if needed
    // (it currently re-derives from the URL, but storing keeps the
    // option open for token rotation / revocation).
    await db
      .update(schema.subscribers)
      .set({ confirmToken })
      .where(eq(schema.subscribers.id, subscriberId))
      .run();

    // Build the URLs the email templates render.
    const base = env.NEXT_PUBLIC_SITE_URL;
    const confirmUrl = `${base}/api/confirm?token=${encodeURIComponent(confirmToken)}`;
    const unsubscribeUrl = `${base}/unsubscribe?token=${encodeURIComponent(confirmToken)}`;

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

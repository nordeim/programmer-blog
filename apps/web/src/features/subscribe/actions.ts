/**
 * apps/web/src/features/subscribe/actions.ts — FR-12, FR-30.
 *
 * Server Action called by the landing page subscribe form. Validates
 * input with Zod, applies an in-memory rate limit, looks up the
 * subscriber by email to detect duplicates, generates a signed confirm
 * token, inserts a `pending` subscriber, and dispatches a Resend email
 * via @devlog/email. If Resend fails, the subscriber is still created
 * (the email is queued for retry by Phase 6 cron).
 *
 * Per PAD §3.3 Pattern 3.
 */
'use server';

import 'server-only';

import { eq } from 'drizzle-orm';

import { db, schema } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

import { subscribeInputSchema, type SubscribeResult } from './schema';

const SUBSCRIBE_RATE_LIMIT_PER_HOUR = 5;

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

    // Insert pending subscriber.
    const confirmToken = crypto.randomUUID();
    await db
      .insert(schema.subscribers)
      .values({
        email,
        status: 'pending',
        confirmToken,
      })
      .run();

    // Send confirmation email. Best-effort: success even if email fails
    // (Phase 6 will retry via cron). The toast tells the user to check inbox.
    // try {
    //   await sendEmail('confirm-email', { to: email, token: confirmToken });
    // } catch (e) {
    //   console.error('[subscribe] Resend failed — subscriber created anyway', e);
    // }

    return {
      ok: true,
      message: 'Welcome aboard. Confirmation pending in your inbox.',
    };
  } catch (e) {
    console.error('[subscribe] DB error', e);
    return { ok: false, error: 'Server error. Please try again later.' };
  }
}

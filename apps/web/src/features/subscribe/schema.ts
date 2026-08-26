/**
 * apps/web/src/features/subscribe/schema.ts — Zod schema for the
 * subscribe form. Also exported for reuse by the Server Action and tests.
 */
import { z } from 'zod';

export const subscribeInputSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

export type SubscribeInput = z.infer<typeof subscribeInputSchema>;

export interface SubscribeSuccess {
  ok: true;
  alreadySubscribed?: boolean;
  message: string;
}

export interface SubscribeFailure {
  ok: false;
  error: string;
  fieldErrors?: Partial<Record<keyof SubscribeInput, string>>;
}

export type SubscribeResult = SubscribeSuccess | SubscribeFailure;

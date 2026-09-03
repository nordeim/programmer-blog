/**
 * packages/types/src/subscriber.ts — subscriber schemas (R-18, MEP #18).
 *
 * Mirrors packages/db/src/schema.ts `subscribers` table constraints.
 */
import { z } from 'zod';

export const subscriberStatusSchema = z.enum([
  'pending',
  'confirmed',
  'unsubscribed',
  'bounced',
]);
export type SubscriberStatus = z.infer<typeof subscriberStatusSchema>;

export const subscriberPreferencesSchema = z.object({
  frequency: z.enum(['weekly', 'monthly']),
});
export type SubscriberPreferences = z.infer<typeof subscriberPreferencesSchema>;

export const subscribeInputSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});
export type SubscribeInput = z.infer<typeof subscribeInputSchema>;

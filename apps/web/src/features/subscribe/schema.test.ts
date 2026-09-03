/**
 * apps/web/src/features/subscribe/schema.test.ts — subscribe input schema.
 */
import { describe, expect, it } from 'vitest';

import { subscribeInputSchema } from './schema';

describe('subscribeInputSchema', () => {
  it('accepts a valid email', () => {
    const parsed = subscribeInputSchema.safeParse({ email: 'a@b.co' });
    expect(parsed.success).toBe(true);
  });

  it('rejects a malformed email with a friendly message', () => {
    const parsed = subscribeInputSchema.safeParse({ email: 'nope' });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe('Please enter a valid email address.');
    }
  });

  it('rejects a missing email', () => {
    expect(subscribeInputSchema.safeParse({}).success).toBe(false);
  });
});

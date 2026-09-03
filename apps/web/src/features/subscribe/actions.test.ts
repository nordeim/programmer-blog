/**
 * apps/web/src/features/subscribe/actions.test.ts — R-3/R-4 tests.
 *
 * The remediation plan mandated these tests (RED 3.1) but they were never
 * written in the first remediation pass. They pin:
 *   1. Valid email → pending row + signed confirm token + sendEmail called
 *      with the ConfirmEmail template props.
 *   2. Duplicate confirmed email → alreadySubscribed, no insert, no email.
 *   3. Rate limit exceeded → error, no email, no insert.
 *   4. Resend failure degrades gracefully (subscriber still created).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendEmailMock, rateLimitMock, signTokenMock } = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  rateLimitMock: vi.fn<(key: string, max: number, windowSeconds: number) => Promise<boolean>>(),
  signTokenMock: vi.fn<(id: string) => string>(),
}));

// Drizzle query builder mock — capture the chained calls.
type Row = Record<string, unknown>;
const { selectAllMock, insertReturningGetMock, updateRunMock } = vi.hoisted(() => ({
  selectAllMock: vi.fn<() => Row[]>(),
  insertReturningGetMock: vi.fn<() => Row | undefined>(),
  updateRunMock: vi.fn(),
}));

vi.mock('@devlog/email', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (key: string, max: number, windowSeconds: number) =>
    rateLimitMock(key, max, windowSeconds),
}));

vi.mock('@/lib/auth', () => ({
  signToken: (id: string) => signTokenMock(id),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => ({
            all: () => selectAllMock(),
          }),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => ({
          get: () => insertReturningGetMock(),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          run: () => updateRunMock(),
        }),
      }),
    }),
  },
  schema: {
    subscribers: {
      id: 'subscribers.id',
      email: 'subscribers.email',
      status: 'subscribers.status',
      confirmToken: 'subscribers.confirmToken',
    },
  },
}));

vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' },
}));

import { subscribeToNewsletter } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  rateLimitMock.mockResolvedValue(true);
  signTokenMock.mockImplementation((id: string) => `${id}.deadbeef`);
});

describe('subscribeToNewsletter (R-3 / R-4)', () => {
  it('creates a pending subscriber with a signed token and sends the email', async () => {
    selectAllMock.mockReturnValue([]);
    insertReturningGetMock.mockReturnValue({ id: 'sub-1' });
    updateRunMock.mockReturnValue(undefined);
    sendEmailMock.mockResolvedValue({ ok: true });

    const result = await subscribeToNewsletter({ email: 'Alex@Devlog.Example' });

    expect(result).toEqual({
      ok: true,
      message: 'Welcome aboard. Confirmation pending in your inbox.',
    });
    // Email is lowercased before the DB lookup.
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@devlog.example',
        subject: 'confirm your /dev/log subscription',
        template: 'confirm-email',
        props: {
          email: 'alex@devlog.example',
          confirmUrl: 'http://localhost:3000/api/confirm?token=sub-1.deadbeef',
          unsubscribeUrl: 'http://localhost:3000/unsubscribe?token=sub-1.deadbeef',
        },
      }),
    );
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(updateRunMock).toHaveBeenCalledTimes(1);
  });

  it('returns alreadySubscribed for a duplicate confirmed email without sending', async () => {
    selectAllMock.mockReturnValue([{ id: 'sub-9', email: 'a@b.co', status: 'confirmed' }]);

    const result = await subscribeToNewsletter({ email: 'a@b.co' });

    expect(result).toEqual({
      ok: true,
      alreadySubscribed: true,
      message: "You're already subscribed. Welcome back.",
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(insertReturningGetMock).not.toHaveBeenCalled();
  });

  it('tells pending/unsubscribed duplicates to check their inbox', async () => {
    for (const status of ['pending', 'unsubscribed', 'bounced']) {
      selectAllMock.mockReturnValue([{ id: 's', email: 'a@b.co', status }]);
      const result = await subscribeToNewsletter({ email: 'a@b.co' });
      expect(result).toMatchObject({
        ok: true,
        alreadySubscribed: true,
        message: "You're already on the list. Check your inbox for the confirmation.",
      });
    }
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('blocks the request when the rate limit is exceeded', async () => {
    rateLimitMock.mockResolvedValue(false);
    const result = await subscribeToNewsletter({ email: 'a@b.co' }, { ip: '203.0.113.9' });
    expect(result).toEqual({
      ok: false,
      error: 'Too many subscribe requests. Try again later.',
    });
    expect(rateLimitMock).toHaveBeenCalledWith('subscribe:203.0.113.9', 5, 3600);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(selectAllMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email before any DB access', async () => {
    const result = await subscribeToNewsletter({ email: 'not-an-email' });
    expect(result).toMatchObject({ ok: false, error: 'Invalid email.' });
    expect(rateLimitMock).not.toHaveBeenCalled();
    expect(selectAllMock).not.toHaveBeenCalled();
  });

  it('degrades gracefully when Resend fails (subscriber still created)', async () => {
    selectAllMock.mockReturnValue([]);
    insertReturningGetMock.mockReturnValue({ id: 'sub-2' });
    sendEmailMock.mockResolvedValue({ ok: false, error: 'resend down' });

    const result = await subscribeToNewsletter({ email: 'a@b.co' });
    expect(result).toEqual({
      ok: true,
      message: 'Welcome aboard. Confirmation pending in your inbox.',
    });
    expect(console.error).toHaveBeenCalled();
  });

  it('degrades gracefully when sendEmail throws', async () => {
    selectAllMock.mockReturnValue([]);
    insertReturningGetMock.mockReturnValue({ id: 'sub-3' });
    sendEmailMock.mockRejectedValue(new Error('network'));

    const result = await subscribeToNewsletter({ email: 'a@b.co' });
    expect(result).toMatchObject({ ok: true });
  });

  it('returns a server error when the insert fails to return an id', async () => {
    selectAllMock.mockReturnValue([]);
    insertReturningGetMock.mockReturnValue(undefined);
    const result = await subscribeToNewsletter({ email: 'a@b.co' });
    expect(result).toEqual({ ok: false, error: 'Server error. Please try again later.' });
  });

  it('returns a server error when the DB throws', async () => {
    selectAllMock.mockImplementation(() => {
      throw new Error('SqliteError');
    });
    const result = await subscribeToNewsletter({ email: 'a@b.co' });
    expect(result).toEqual({ ok: false, error: 'Server error. Please try again later.' });
  });
});

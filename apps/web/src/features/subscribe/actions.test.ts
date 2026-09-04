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

const { sendEmailMock, rateLimitMock, signTokenMock, createTransactionTokenMock, verifyTokenMock } =
  vi.hoisted(() => ({
    sendEmailMock: vi.fn(),
    rateLimitMock: vi.fn<(key: string, max: number, windowSeconds: number) => Promise<boolean>>(),
    signTokenMock: vi.fn<(id: string) => string>(),
    createTransactionTokenMock: vi.fn<(id: string) => string>(),
    verifyTokenMock: vi.fn<(...args: unknown[]) => Promise<boolean>>(),
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

// R-40: the action reads the client IP from proxy headers via next/headers.
vi.mock('next/headers', () => ({
  headers: () =>
    Promise.resolve({
      get: (name: string) => {
        if (name.toLowerCase() === 'x-forwarded-for') return '198.51.100.10';
        return null;
      },
    }),
}));

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: (key: string, max: number, windowSeconds: number) =>
    rateLimitMock(key, max, windowSeconds),
}));

vi.mock('@/lib/auth', () => ({
  signToken: (id: string) => signTokenMock(id),
  createTransactionToken: (id: string) => createTransactionTokenMock(id),
  verifyTransactionToken: (...args: unknown[]) => verifyTokenMock(...(args as [])),
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

import { confirmUnsubscribe, subscribeToNewsletter } from './actions';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  rateLimitMock.mockResolvedValue(true);
  signTokenMock.mockImplementation((id: string) => `${id}.deadbeef`);
  verifyTokenMock.mockResolvedValue(false);
  // R-80: v2 confirm token mock — `<id>.<iat>.confirm.<mac>`.
  createTransactionTokenMock.mockImplementation(
    (id: string) => `${id}.${Math.floor(Date.now() / 1000)}.confirm.deadbeef`,
  );
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
    // Email is lowercased before the DB lookup. R-80: the confirm link
    // carries the v2 purpose-tagged token; the manage link stays v1.
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'alex@devlog.example',
        subject: 'confirm your /dev/log subscription',
        template: 'confirm-email',
        props: {
          email: 'alex@devlog.example',
          confirmUrl: expect.stringMatching(
            /^http:\/\/localhost:3000\/api\/confirm\?token=sub-1\.\d{10}\.confirm\.deadbeef$/,
          ),
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
    // R-58 (H-39): no caller-supplied IP — the key comes from the mocked
    // proxy headers above (x-forwarded-for: 198.51.100.10).
    const result = await subscribeToNewsletter({ email: 'a@b.co' });
    expect(result).toEqual({
      ok: false,
      error: 'Too many subscribe requests. Try again later.',
    });
    expect(rateLimitMock).toHaveBeenCalledWith('subscribe:198.51.100.10', 5, 3600);
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


describe('confirmUnsubscribe — R-74 (Pass 7, H-42)', () => {
  it('rejects a token that fails manage-purpose verification', async () => {
    verifyTokenMock.mockResolvedValue(false);

    const result = await confirmUnsubscribe({ token: 'sub-1.forged' });

    expect(result).toEqual({ ok: false, error: 'invalid or expired token' });
    expect(updateRunMock).not.toHaveBeenCalled();
  });

  it('rejects malformed input without touching the DB', async () => {
    const result = await confirmUnsubscribe({});

    expect(result).toEqual({ ok: false, error: 'missing token' });
    expect(selectAllMock).not.toHaveBeenCalled();
  });

  it('unsubscribes a confirmed subscriber via the action', async () => {
    verifyTokenMock.mockImplementation(async (...args: unknown[]) => {
      return args[2] === 'manage';
    });
    selectAllMock.mockReturnValue([{ id: 'sub-9', email: 'r@t.dev', status: 'confirmed' }]);

    const result = await confirmUnsubscribe({ token: 'sub-9.good' });

    expect(result).toEqual({ ok: true, message: "you're out." });
    expect(updateRunMock).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: an already-unsubscribed subscriber triggers no second write', async () => {
    verifyTokenMock.mockResolvedValue(true);
    selectAllMock.mockReturnValue([{ id: 'sub-9', email: 'r@t.dev', status: 'unsubscribed' }]);

    const result = await confirmUnsubscribe({ token: 'sub-9.good' });

    expect(result).toEqual({ ok: true, message: "you're out." });
    expect(updateRunMock).not.toHaveBeenCalled();
  });

  it('reports an unknown subscriber instead of writing', async () => {
    verifyTokenMock.mockResolvedValue(true);
    selectAllMock.mockReturnValue([]);

    const result = await confirmUnsubscribe({ token: 'sub-404.good' });

    expect(result).toEqual({ ok: false, error: 'unknown subscriber' });
    expect(updateRunMock).not.toHaveBeenCalled();
  });
});

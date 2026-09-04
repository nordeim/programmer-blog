/**
 * apps/web/src/app/(public)/unsubscribe/page.test.tsx — R-55 (Pass 5, L-39)
 * + R-74 (Pass 7, H-42).
 *
 * R-74: the page used to perform the destructive unsubscribe DB write
 * during the GET render — email scanners and privacy prefetchers follow
 * links with GET, silently unsubscribing users who never clicked. The
 * GET now renders a confirmation form (or the already-unsubscribed done
 * state, idempotently); ONLY the `confirmUnsubscribe` Server Action
 * writes. The R-55 calm error copy for missing/invalid tokens is kept.
 */
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const chainable = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  all: vi.fn().mockReturnValue([]),
  set: vi.fn().mockReturnThis(),
  run: vi.fn().mockReturnValue({}),
};

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => chainable),
    update: vi.fn(() => chainable),
  },
  schema: { subscribers: {} },
}));

const verifyTokenMock = vi.fn(async () => false);

vi.mock('@devlog/auth', () => ({
  verifyTransactionToken: (...args: unknown[]) => verifyTokenMock(...(args as [])),
}));

const confirmUnsubscribeMock = vi.fn(async () => ({ ok: true, message: 'done' }));

vi.mock('@/features/subscribe/actions', () => ({
  confirmUnsubscribe: (...args: unknown[]) => confirmUnsubscribeMock(...(args as [])),
}));

import UnsubscribePage from './page';

describe('UnsubscribePage — R-55 (L-39 error-state copy)', () => {
  beforeEach(() => {
    verifyTokenMock.mockClear();
    verifyTokenMock.mockResolvedValue(false);
    chainable.all.mockReturnValue([]);
    chainable.run.mockClear();
  });

  it('does NOT headline "something broke" for a missing token', async () => {
    const ui = await UnsubscribePage({ searchParams: Promise.resolve({}) });
    const { container } = render(ui);
    expect(container.textContent).not.toMatch(/something broke/i);
    expect(container.textContent).toMatch(/couldn't confirm/i);
    expect(container.textContent).toMatch(/\$ missing token/i);
  });

  it('does NOT headline "something broke" for an invalid token either', async () => {
    const ui = await UnsubscribePage({
      searchParams: Promise.resolve({ token: 'not-a-token' }),
    });
    const { container } = render(ui);
    expect(container.textContent).not.toMatch(/something broke/i);
  });
});

describe('UnsubscribePage — R-74 (H-42): no destructive write on GET', () => {
  beforeEach(() => {
    verifyTokenMock.mockClear();
    chainable.all.mockReturnValue([]);
    chainable.run.mockClear();
  });

  it('renders a confirmation form and performs NO write for a verified subscriber', async () => {
    verifyTokenMock.mockResolvedValue(true);
    chainable.all.mockReturnValue([
      { id: 'sub-1', email: 'reader@test.dev', status: 'confirmed' },
    ]);

    const ui = await UnsubscribePage({
      searchParams: Promise.resolve({ token: 'sub-1.good' }),
    });
    const { container } = render(ui);

    expect(container.querySelector('form')).toBeTruthy();
    expect(container.querySelector('input[name="token"]')?.getAttribute('value')).toBe(
      'sub-1.good',
    );
    expect(container.textContent).toMatch(/reader@test\.dev/);
    expect(container.textContent).toMatch(/confirm/i);
    // THE regression pin: GET must never mutate.
    expect(chainable.run).not.toHaveBeenCalled();
  });

  it('shows the done state directly (no write) when already unsubscribed', async () => {
    verifyTokenMock.mockResolvedValue(true);
    chainable.all.mockReturnValue([
      { id: 'sub-1', email: 'reader@test.dev', status: 'unsubscribed' },
    ]);

    const ui = await UnsubscribePage({
      searchParams: Promise.resolve({ token: 'sub-1.good' }),
    });
    const { container } = render(ui);

    expect(container.textContent).toMatch(/you're/i);
    expect(container.textContent).toMatch(/removed from the \/dev\/log dispatch/i);
    expect(chainable.run).not.toHaveBeenCalled();
  });

  it('keeps the calm error copy for an unknown subscriber', async () => {
    verifyTokenMock.mockResolvedValue(true);
    chainable.all.mockReturnValue([]);

    const ui = await UnsubscribePage({
      searchParams: Promise.resolve({ token: 'sub-404.good' }),
    });
    const { container } = render(ui);

    expect(container.textContent).toMatch(/couldn't confirm/i);
    expect(container.textContent).toMatch(/unknown subscriber/);
  });
});

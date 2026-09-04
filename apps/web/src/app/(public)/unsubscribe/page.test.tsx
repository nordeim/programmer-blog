/**
 * apps/web/src/app/(public)/unsubscribe/page.test.tsx — R-55 (Pass 5, L-39).
 *
 * The missing/invalid-token state used to headline "something broke",
 * which reads as a SYSTEM failure for what is a USER-input error (a
 * newsletter email link with a missing/expired token). R-55 renders a
 * calm "couldn't confirm" state instead; the success state ("you're
 * out") is unchanged.
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
  verifyToken: (...args: unknown[]) => verifyTokenMock(...(args as [])),
}));

import UnsubscribePage from './page';

describe('UnsubscribePage — R-55 (L-39 error-state copy)', () => {
  beforeEach(() => {
    verifyTokenMock.mockClear();
    verifyTokenMock.mockResolvedValue(false);
    chainable.all.mockReturnValue([]);
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

  it('keeps the branded success headline on a verified unsubscribe', async () => {
    verifyTokenMock.mockResolvedValue(true);
    chainable.all.mockReturnValue([
      { id: 'sub-1', email: 'reader@test.dev', status: 'confirmed' },
    ]);

    const ui = await UnsubscribePage({
      searchParams: Promise.resolve({ token: 'sub-1.good' }),
    });
    const { container } = render(ui);

    expect(container.textContent).toMatch(/you're/i);
    expect(container.textContent).toMatch(/out/i);
    expect(container.textContent).toMatch(/removed from the \/dev\/log dispatch/i);
  });
});

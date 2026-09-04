/**
 * apps/web/src/features/landing/subscribe-section.test.tsx — R-77 (Pass 7, M-51).
 *
 * Pins the success path end-to-end: React 19 nulls a synthetic event's
 * `currentTarget` once the synchronous dispatch finishes, so touching
 * `e.currentTarget` after `await subscribeToNewsletter(...)` threw
 * `TypeError: Cannot read properties of null` on EVERY successful
 * subscribe. The observable contract: a successful submit blurs the
 * email input (the placeholder shows again) and completes cleanly.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const subscribeMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/subscribe/actions', () => ({
  subscribeToNewsletter: subscribeMock,
}));

vi.mock('@/stores/ui-store', () => ({
  useUiStore: (selector: (s: { showSubscribeToast: () => void }) => unknown) =>
    selector({ showSubscribeToast: vi.fn() }),
}));

import { SubscribeSection } from './subscribe-section';

describe('SubscribeSection — success path (R-77 / M-51)', () => {
  it('completes a successful subscribe cleanly (no currentTarget TypeError)', async () => {
    subscribeMock.mockResolvedValue({ ok: true, message: 'welcome aboard.' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<SubscribeSection />);
    const input = screen.getByLabelText('Your email') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'reader@devlog.example' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    // Pre-R-77 the post-await `e.currentTarget.querySelector(...)` access
    // threw `TypeError: Cannot read properties of null` — vitest surfaces
    // that as an unhandled-rejection test failure, so a clean resolve here
    // IS the regression pin.
    await waitFor(() => {
      expect(subscribeMock).toHaveBeenCalledWith({ email: 'reader@devlog.example' });
      expect(input).toHaveValue('');
    });

    const typeError = errorSpy.mock.calls.find((call) =>
      String(call[0]).includes('Cannot read properties of null'),
    );
    expect(typeError).toBeUndefined();
    errorSpy.mockRestore();
  });

  it('shows the field error and keeps focus when the action fails', async () => {
    subscribeMock.mockResolvedValue({ ok: false, error: 'Already subscribed.' });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<SubscribeSection />);
    const input = screen.getByLabelText('Your email') as HTMLInputElement;
    input.focus();
    fireEvent.change(input, { target: { value: 'reader@devlog.example' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Already subscribed.');
    });
    expect(document.activeElement).toBe(input);
    errorSpy.mockRestore();
  });
});

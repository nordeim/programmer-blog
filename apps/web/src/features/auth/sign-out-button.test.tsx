/**
 * apps/web/src/features/auth/sign-out-button.test.tsx — FR-33.
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const signOutActionMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/actions', () => ({
  signOutAction: () => signOutActionMock(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock, push: vi.fn(), prefetch: vi.fn() }),
}));

import { SignOutButton } from './sign-out-button';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SignOutButton', () => {
  it('renders the sign-out button', () => {
    const { getByTestId } = render(<SignOutButton />);
    expect(getByTestId('sign-out').textContent).toContain('sign out');
  });

  it('signs out and redirects to /admin/login', async () => {
    signOutActionMock.mockResolvedValue({ redirectTo: '/admin/login' });
    const { getByTestId } = render(<SignOutButton />);
    fireEvent.click(getByTestId('sign-out'));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/admin/login'));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('logs and stays put when the action throws', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    signOutActionMock.mockRejectedValue(new Error('boom'));
    const { getByTestId } = render(<SignOutButton />);
    fireEvent.click(getByTestId('sign-out'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(replaceMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

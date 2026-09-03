/**
 * apps/web/src/features/auth/login-form.test.tsx — FR-33.
 */
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const signInActionMock = vi.hoisted(() => vi.fn());
const replaceMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/auth/actions', () => ({
  signInAction: (input: unknown) => signInActionMock(input),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock, push: vi.fn(), prefetch: vi.fn() }),
}));

import { LoginForm } from './login-form';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginForm', () => {
  it('renders the email + password fields and submit button', () => {
    const { getByLabelText, getByRole, getByTestId } = render(<LoginForm />);
    expect(getByTestId('login-form')).toBeTruthy();
    expect(getByLabelText(/email/i)).toBeTruthy();
    expect(getByLabelText(/password/i)).toBeTruthy();
    expect(getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('submits credentials to the server action and redirects on success', async () => {
    signInActionMock.mockResolvedValue({ ok: true, redirectTo: '/admin' });
    const { getByLabelText, getByRole } = render(<LoginForm />);

    fireEvent.change(getByLabelText(/email/i), { target: { value: 'author@devlog.example' } });
    fireEvent.change(getByLabelText(/password/i), { target: { value: 'dev-password-12345' } });
    fireEvent.click(getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(signInActionMock).toHaveBeenCalledWith({
        email: 'author@devlog.example',
        password: 'dev-password-12345',
        next: '/admin',
      });
    });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/admin'));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('surfaces the server error inline on failure', async () => {
    signInActionMock.mockResolvedValue({ ok: false, error: 'Invalid email or password.' });
    const { getByLabelText, getByRole, findByText } = render(<LoginForm />);

    fireEvent.change(getByLabelText(/email/i), { target: { value: 'a@b.co' } });
    fireEvent.change(getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(getByRole('button', { name: /sign in/i }));

    expect(await findByText('Invalid email or password.')).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('handles a thrown action as a network error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    signInActionMock.mockRejectedValue(new Error('boom'));
    const { getByLabelText, getByRole, findByText } = render(<LoginForm />);

    fireEvent.change(getByLabelText(/email/i), { target: { value: 'a@b.co' } });
    fireEvent.change(getByLabelText(/password/i), { target: { value: 'x' } });
    fireEvent.click(getByRole('button', { name: /sign in/i }));
    expect(await findByText('Network error. Please try again.')).toBeTruthy();
    spy.mockRestore();
  });

  it('disables the submit button while submitting', async () => {
    let resolveAction: (v: unknown) => void = () => {};
    signInActionMock.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );
    const { getByLabelText, getByRole } = render(<LoginForm />);
    fireEvent.change(getByLabelText(/email/i), { target: { value: 'a@b.co' } });
    fireEvent.change(getByLabelText(/password/i), { target: { value: 'x' } });
    fireEvent.click(getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(getByRole('button')).toBeDisabled());
    resolveAction({ ok: true, redirectTo: '/admin' });
    await waitFor(() => expect(getByRole('button')).toBeEnabled());
  });
});

/**
 * apps/web/src/features/auth/login-form.tsx — FR-33.
 *
 * Client component. Email + password form. Calls the `signIn` Server
 * Action. On success, redirects to `next` (or `/admin`). Surfaces
 * server-returned errors inline.
 *
 * Phase 6 v1: the seed sets passwordHash='dev-only-placeholder...'.
 * The server action accepts any password for the seeded author email.
 * A TODO is wired in to swap to bcrypt compare.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { signInAction } from '@/features/auth/actions';

interface LoginFormProps {
  nextHref?: string;
}

export function LoginForm({ nextHref = '/admin' }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signInAction({ email, password, next: nextHref });
      if (!result.ok) {
        setError(result.error ?? 'Unable to sign in.');
        return;
      }
      router.replace(result.redirectTo);
      router.refresh();
    } catch (err) {
      console.error('[login-form] submit failed', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 max-w-sm"
      aria-label="Sign in to /dev/log admin"
      data-testid="login-form"
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="login-email"
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: 'var(--muted)' }}
        >
          email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-[var(--bg-elev)] border border-[var(--border)] font-mono text-sm px-3 py-2"
          disabled={submitting}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="login-password"
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: 'var(--muted)' }}
        >
          password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-[var(--bg-elev)] border border-[var(--border)] font-mono text-sm px-3 py-2"
          disabled={submitting}
        />
      </div>
      <button
        type="submit"
        className="btn-secondary"
        disabled={submitting || !email || !password}
      >
        {submitting ? 'signing in…' : 'sign in'}
      </button>
      {error ? (
        <p
          role="alert"
          className="font-mono text-sm"
          style={{ color: 'var(--accent)' }}
          data-testid="login-error"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}

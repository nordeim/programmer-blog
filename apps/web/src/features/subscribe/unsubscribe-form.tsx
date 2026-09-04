/**
 * apps/web/src/features/subscribe/unsubscribe-form.tsx — R-74 (Pass 7, H-42).
 *
 * Client component. Rendered by the /unsubscribe server component for a
 * verified subscriber. The GET must never mutate, so the actual
 * unsubscribe write happens here, on an explicit POST through the
 * `confirmUnsubscribe` Server Action (email-client prefetchers follow
 * links but do not submit forms).
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';

import { confirmUnsubscribe } from '@/features/subscribe/actions';

interface UnsubscribeFormProps {
  token: string;
  email: string;
}

export function UnsubscribeForm({ token, email }: UnsubscribeFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await confirmUnsubscribe({ token });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <>
        <h1
          className="font-display font-black text-4xl md:text-6xl"
          style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
          data-testid="unsubscribe-done"
        >
          you&apos;re <span style={{ fontStyle: 'italic', fontWeight: 400 }}>out</span>
        </h1>
        <p className="text-base md:text-lg mt-6" style={{ color: 'var(--muted)' }}>
          {`${email} have been removed from the /dev/log dispatch. you won't receive any more emails from us.`}
        </p>
        <div className="mt-12">
          <Link href="/" className="btn-secondary">
            ← back to /dev/log
          </Link>
        </div>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} aria-label="Confirm unsubscribe">
      <h1
        className="font-display font-black text-4xl md:text-6xl"
        style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
      >
        one click to <span style={{ fontStyle: 'italic', fontWeight: 400 }}>opt out</span>
      </h1>
      <p className="text-base md:text-lg mt-6" style={{ color: 'var(--muted)' }}>
        {`leaving from ${email}? confirm below and the dispatch stops — no "are you sure" games.`}
      </p>
      <input type="hidden" name="token" value={token} />
      <button type="submit" className="btn-primary mt-8" disabled={submitting}>
        {submitting ? 'confirming…' : 'confirm unsubscribe'}
      </button>
      {error ? (
        <p
          className="font-mono text-sm mt-4"
          style={{ color: 'var(--accent-2)' }}
          role="alert"
        >
          $ {error}
        </p>
      ) : null}
    </form>
  );
}

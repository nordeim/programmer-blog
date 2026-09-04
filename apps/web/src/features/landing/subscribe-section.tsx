/**
 * apps/web/src/features/landing/subscribe-section.tsx — FR-12, FR-30.
 *
 * The subscribe form. Client component (manages input + submit state).
 * Validates input, calls the `subscribeToNewsletter` Server Action,
 * shows the <SubscribeToast> on success, sets a field-level error
 * message on validation failure.
 *
 * Source: landing_page_mockup.html lines 968-1007.
 */
'use client';

import { useState } from 'react';

import { subscribeToNewsletter } from '@/features/subscribe/actions';
import { useUiStore } from '@/stores/ui-store';

import { SubscribeToast } from './subscribe-toast';

const EMAIL_PLACEHOLDER = 'you@somewhere.dev';

export function SubscribeSection() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState(
    'welcome aboard. confirmation pending in your inbox.',
  );
  const [isPending, setIsPending] = useState(false);
  const showToast = useUiStore((s) => s.showSubscribeToast);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // R-77 (Pass 7, M-51): React 19 nulls a synthetic event's
    // `currentTarget` as soon as the synchronous dispatch finishes, so it
    // must be captured BEFORE the first `await` — reading it afterwards
    // threw `TypeError: Cannot read properties of null` on every
    // successful subscribe.
    const form = e.currentTarget;
    setError(null);
    setIsPending(true);
    const formData = new FormData(form);
    const emailValue = String(formData.get('email') ?? '').trim();
    setEmail(emailValue);

    try {
      const result = await subscribeToNewsletter({ email: emailValue });
      if (!result.ok) {
        if (result.fieldErrors?.email) {
          setError(result.fieldErrors.email);
        } else {
          setError(result.error);
        }
        return;
      }
      setToastMessage(result.message);
      showToast();
      setEmail('');
      setError(null);
      // Blur the input so the placeholder shows.
      (form.querySelector('input[type="email"]') as HTMLInputElement | null)?.blur();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section
      className="py-24 md:py-32 px-6"
      id="about"
      style={{ background: 'var(--bg-elev)' }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 reveal">
          <div
            className="font-mono text-xs uppercase tracking-widest mb-4"
            style={{ color: 'var(--accent)' }}
          >
            {'//'} stay in the loop
          </div>
          <h2
            className="font-display font-black text-5xl md:text-6xl mb-6"
            style={{ letterSpacing: '-0.035em', lineHeight: 1 }}
          >
            Every other <span style={{ fontStyle: 'italic', fontWeight: 400 }}>Tuesday.</span>
          </h2>
          <p
            className="text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--muted)', lineHeight: 1.6 }}
          >
            One essay. No tracking, no ads, no <em>&quot;10x&quot;</em> anything. Unsubscribe
            with a single click — I won&apos;t even be offended.
          </p>
        </div>

        <form
          className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto reveal"
          onSubmit={handleSubmit}
          aria-label="Subscribe to the newsletter"
          noValidate
        >
          <input
            type="email"
            name="email"
            placeholder={EMAIL_PLACEHOLDER}
            required
            className="input-field flex-1"
            aria-label="Your email"
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? 'sub-error' : undefined}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
          />
          <button
            type="submit"
            className="btn-primary justify-center"
            disabled={isPending}
          >
            {isPending ? 'subscribing…' : 'subscribe'}
            <span aria-hidden="true" className="text-xs">
              →
            </span>
          </button>
        </form>
        {error ? (
          <p
            id="sub-error"
            className="font-mono text-sm mt-3 text-center"
            style={{ color: 'var(--accent-2)' }}
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <SubscribeToast message={toastMessage} />

        <div className="mt-16 grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto reveal">
          <div className="text-center">
            <div
              className="font-mono font-bold text-2xl mb-2"
              style={{ color: 'var(--accent)' }}
            >
              No spam
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              One email every two weeks. That&apos;s it.
            </div>
          </div>
          <div className="text-center">
            <div
              className="font-mono font-bold text-2xl mb-2"
              style={{ color: 'var(--accent)' }}
            >
              No tracking
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Self-hosted on a $5 box. No analytics.
            </div>
          </div>
          <div className="text-center">
            <div
              className="font-mono font-bold text-2xl mb-2"
              style={{ color: 'var(--accent)' }}
            >
              No paywall
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              Free forever. Or until I run out of coffee.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * apps/web/src/app/error.tsx — branded 500 page (client component).
 *
 * Renders when an unhandled error is thrown in a Server Component
 * (or a Client Component outside an error boundary). Client component
 * so it can catch both server- and client-side runtime errors.
 *
 * Branded to match the /dev/log CLI aesthetic:
 *   $ segmentation fault (core dumped)
 */
'use client';

import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('[error-boundary] unhandled error:', error);
  }, [error]);

  return (
    <section className="py-32 px-6 min-h-[60vh] flex items-center" data-testid="error-page">
      <div className="max-w-3xl mx-auto w-full">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-4"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} 500
        </div>
        <h1
          className="font-display font-black text-5xl md:text-7xl"
          style={{ letterSpacing: '-0.035em', lineHeight: 1 }}
        >
          segmentation <span style={{ fontStyle: 'italic', fontWeight: 400 }}>fault</span>
        </h1>
        <p
          className="font-mono text-base md:text-lg mt-8"
          style={{ color: 'var(--muted)' }}
        >
          $ (core dumped) — something blew up on the server. the logs know
          the rest.
        </p>
        {error.digest ? (
          <p className="font-mono text-xs mt-4" style={{ color: 'var(--muted)' }}>
            digest: {error.digest}
          </p>
        ) : null}
        <div className="mt-12 flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => reset()}>
            try again
          </button>
          <Link href="/" className="hover-link font-mono text-sm">
            ← back home
          </Link>
        </div>
      </div>
    </section>
  );
}

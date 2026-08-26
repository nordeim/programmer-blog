/**
 * apps/web/src/app/not-found.tsx — branded 404 page.
 *
 * Renders when `notFound()` is called anywhere, or when no route
 * matches. Branded to match the /dev/log CLI aesthetic:
 *   $ command not found: <url>
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="py-32 px-6 min-h-[60vh] flex items-center" data-testid="not-found">
      <div className="max-w-3xl mx-auto w-full">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-4"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} 404
        </div>
        <h1
          className="font-display font-black text-5xl md:text-7xl"
          style={{ letterSpacing: '-0.035em', lineHeight: 1 }}
        >
          command <span style={{ fontStyle: 'italic', fontWeight: 400 }}>not found</span>
        </h1>
        <p
          className="font-mono text-base md:text-lg mt-8"
          style={{ color: 'var(--muted)' }}
        >
          $ the page you requested doesn&apos;t exist. maybe it was never
          written. maybe it was deleted. the git log remembers.
        </p>
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href="/" className="btn-secondary">
            ← back home
          </Link>
          <Link href="/archive" className="hover-link font-mono text-sm">
            browse the archive
          </Link>
          <Link href="/snippets" className="hover-link font-mono text-sm">
            read the snippets
          </Link>
        </div>
      </div>
    </section>
  );
}

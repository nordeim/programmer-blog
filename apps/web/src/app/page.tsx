/**
 * apps/web/src/app/page.tsx — Phase 1 placeholder landing page.
 *
 * This is the RED→GREEN target for the Phase 1 smoke test
 * (apps/web/src/app/page.test.tsx). It renders a minimal "/dev/log"
 * logotype with a blinking cursor in the terminal-style mono font, so
 * `pnpm dev` boots a recognisable page.
 *
 * Phase 4 of the MEP replaces this file with the full landing-page
 * composition (<Hero>, <Marquee>, <RecentNotes>, <SnippetShowcase>,
 * <ArchivePreview>, <SubscribeSection>).
 */
export default function HomePage() {
  return (
    <main
      id="main"
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24"
    >
      <h1
        className="font-mono text-5xl font-bold tracking-tight sm:text-7xl"
        style={{ color: 'var(--fg)', letterSpacing: '-0.045em' }}
      >
        <span style={{ color: 'var(--accent)' }}>/</span>
        <span style={{ color: 'var(--fg)' }}>dev</span>
        <span style={{ color: 'var(--muted)' }}>/</span>
        <span style={{ color: 'var(--fg)' }}>log</span>
        <span className="logo-cursor" aria-hidden="true" />
      </h1>
      <p className="font-display text-xl italic" style={{ color: 'var(--fg-dim)' }}>
        Notes from a programmer&apos;s desk.
      </p>
      <p
        className="font-mono text-xs uppercase tracking-widest"
        style={{ color: 'var(--muted)' }}
      >
        Phase 1 scaffolding · landing page coming in Phase 4
      </p>
      {/* Hidden marker for the smoke test. */}
      <span data-testid="logotype-marker" className="sr-only">
        /dev/log
      </span>
    </main>
  );
}

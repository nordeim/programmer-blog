/**
 * apps/web/src/components/skip-link.tsx — a11y skip-to-content.
 *
 * Rendered as the first focusable element in <body>. Visually hidden
 * until focused, then snaps to top-left.
 *
 * Source: PAD §6.3 (skip-link pattern).
 */
export function SkipLink({ targetId = 'main' }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:border focus:border-[var(--accent)] focus:bg-[var(--bg)] focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-[var(--accent)]"
    >
      skip to content
    </a>
  );
}

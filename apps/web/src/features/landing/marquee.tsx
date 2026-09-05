/**
 * apps/web/src/features/landing/marquee.tsx — FR-7.
 *
 * The technology marquee. Pure CSS animation (no JS). The marquee
 * track contains the technologies twice (so the loop is seamless).
 *
 * Source: landing_page_mockup.html lines 692-698.
 */
const TECHNOLOGIES = [
  'JavaScript',
  'TypeScript',
  'Rust',
  'Go',
  'WebAssembly',
  'PostgreSQL',
  'Redis',
  'Docker',
  'Kubernetes',
  'Linux',
  'NeoVim',
] as const;

export function Marquee() {
  return (
    <div
      className="py-5 border-y marquee-wrap"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-elev)' }}
    >
      <div
        className="marquee font-mono text-sm uppercase tracking-widest"
        // R-99 (audit M-58): --fg-dim, not --muted — the hero's cyan glow
        // composites the effective background to ~#113b40 where --muted
        // measures 3.2:1 (< WCAG AA 4.5:1); --fg-dim holds ≥6.8:1.
        // Mockup-first change (landing_page_mockup.html marquee block).
        style={{ color: 'var(--fg-dim)' }}
      >
        {[0, 1].map((duplicate) => (
          <span key={duplicate} aria-hidden={duplicate === 1 ? 'true' : undefined}>
            {TECHNOLOGIES.map((tech) => (
              <span key={`${duplicate}-${tech}`}>
                <span>{tech}</span>
                <span>·</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

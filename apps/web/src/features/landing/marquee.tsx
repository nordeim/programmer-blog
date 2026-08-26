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
        style={{ color: 'var(--muted)' }}
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

/**
 * apps/web/src/features/landing/hero.tsx — FR-5, FR-6, FR-16.
 *
 * Server component for the hero section. Renders:
 *   - float-dot ambient orbs
 *   - <HeroMouseGlow> (client)
 *   - Issue meta (tag + date + "currently publishing")
 *   - <HeroTypewriter> (client)
 *   - Subtitle paragraphs
 *   - CTAs (read latest / subscribe)
 *   - Stats grid (142 / 8.2k / 2d / ∞)
 *   - Scroll cue
 *
 * Source: landing_page_mockup.html lines 619-690.
 */
import Link from 'next/link';

import { Tag } from '@/components/tag';

import { HeroMouseGlow } from './hero-mouse-glow';
import { HeroTypewriter } from './hero-typewriter';

export function Hero() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-grid pt-24 pb-20"
      id="hero"
    >
      <div
        className="float-dot"
        style={{
          width: 500,
          height: 500,
          top: '5%',
          left: -150,
          background: 'var(--accent)',
        }}
        aria-hidden="true"
      />
      <div
        className="float-dot"
        style={{
          width: 600,
          height: 600,
          bottom: -200,
          right: -200,
          background: 'var(--accent-2)',
          animationDelay: '-5s',
        }}
        aria-hidden="true"
      />
      <HeroMouseGlow />

      <div className="relative max-w-7xl mx-auto px-6 w-full" style={{ zIndex: 2 }}>
        <div className="max-w-5xl">
          <div
            className="flex items-center gap-3 mb-8 font-mono text-xs flex-wrap"
            style={{ color: 'var(--muted)' }}
          >
            <Tag>Issue 042</Tag>
            <span>·</span>
            <span>November 12, 2024</span>
            <span>·</span>
            <span className="flex items-center gap-2">
              <span className="stat-dot" /> currently publishing
            </span>
          </div>

          <h1
            className="font-mono font-bold mb-8"
            style={{
              fontSize: 'clamp(2.5rem, 7.5vw, 6.5rem)',
              lineHeight: 1.02,
              letterSpacing: '-0.045em',
            }}
          >
            <span style={{ color: 'var(--muted)' }}>$</span>{' '}
            <HeroTypewriter />
          </h1>

          <p
            className="font-display text-2xl md:text-3xl mb-5"
            style={{
              fontStyle: 'italic',
              fontWeight: 400,
              color: 'var(--fg)',
              lineHeight: 1.3,
            }}
          >
            Notes from a programmer&apos;s desk — on code, systems, and the strange
            joy of debugging at 2am.
          </p>

          <p
            className="text-base md:text-lg mb-12 max-w-2xl"
            style={{ color: 'var(--muted)', lineHeight: 1.6 }}
          >
            I&apos;m <span style={{ color: 'var(--fg)', fontWeight: 500 }}>Alex Rivera</span>{' '}
            — software engineer writing about the craft. TypeScript today, Rust
            tomorrow, assembly for fun. New essay every other Tuesday.
          </p>

          <div className="flex flex-wrap gap-4 mb-20">
            <Link href="/#notes" className="btn-primary">
              read latest
              <span aria-hidden="true" className="text-xs">
                →
              </span>
            </Link>
            <Link href="/#about" className="btn-secondary">
              <span aria-hidden="true" className="text-xs">
                ≡
              </span>
              subscribe
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl">
            <div>
              <div
                className="font-mono font-bold text-3xl md:text-4xl"
                style={{ color: 'var(--accent)' }}
              >
                142
              </div>
              <div
                className="font-mono text-xs uppercase tracking-widest mt-2"
                style={{ color: 'var(--muted)' }}
              >
                essays published
              </div>
            </div>
            <div>
              <div
                className="font-mono font-bold text-3xl md:text-4xl"
                style={{ color: 'var(--accent)' }}
              >
                8.2k
              </div>
              <div
                className="font-mono text-xs uppercase tracking-widest mt-2"
                style={{ color: 'var(--muted)' }}
              >
                regular readers
              </div>
            </div>
            <div>
              <div
                className="font-mono font-bold text-3xl md:text-4xl"
                style={{ color: 'var(--accent)' }}
              >
                2d
              </div>
              <div
                className="font-mono text-xs uppercase tracking-widest mt-2"
                style={{ color: 'var(--muted)' }}
              >
                since last commit
              </div>
            </div>
            <div>
              <div
                className="font-mono font-bold text-3xl md:text-4xl"
                style={{ color: 'var(--accent)' }}
              >
                ∞
              </div>
              <div
                className="font-mono text-xs uppercase tracking-widest mt-2"
                style={{ color: 'var(--muted)' }}
              >
                cups of coffee
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs flex flex-col items-center gap-3"
        style={{ color: 'var(--muted)' }}
        aria-hidden="true"
      >
        <span className="tracking-widest uppercase">scroll</span>
        <div
          style={{
            width: 1,
            height: 30,
            background: 'linear-gradient(to bottom, var(--accent), transparent)',
          }}
        />
      </div>
    </section>
  );
}

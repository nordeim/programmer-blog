/**
 * apps/web/src/features/landing/hero-mouse-glow.tsx — FR-5.
 *
 * Wraps `useMouseGlow` and renders the .mouse-glow div positioned at
 * the mouse coordinates inside the hero section. Hidden until the
 * mouse enters the section.
 *
 * Source: landing_page_mockup.html lines 623, 1162-1177.
 */
'use client';

import { useMouseGlow } from '@/hooks/use-mouse-glow';

export function HeroMouseGlow() {
  // R-79 (Pass 7, M-53): track on the PARENT hero section. The overlay is
  // deliberately `pointer-events: none` (it must never block hero links),
  // which also means it can never receive pointer events itself — the
  // previous self-tracking composition was dead code in every browser.
  const { ref, position, visible } = useMouseGlow({ track: 'parent' });
  return (
    <div
      ref={ref}
      className="absolute inset-0"
      style={{ pointerEvents: 'none', zIndex: 1 }}
    >
      <div
        className="mouse-glow"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          opacity: visible ? 1 : 0,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

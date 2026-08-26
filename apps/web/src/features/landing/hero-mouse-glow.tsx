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
  const { ref, position, visible } = useMouseGlow();
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

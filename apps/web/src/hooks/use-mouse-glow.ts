/**
 * apps/web/src/hooks/use-mouse-glow.ts — FR-5.
 *
 * Returns [ref, position, visible]. Tracks the mouse within `ref.current`
 * bounds and provides the {x, y} coordinates (in pixels, relative to the
 * element). Visibility is toggled on mouseenter/mouseleave.
 *
 * Source: landing_page_mockup.html lines 1162-1177 (mouseGlow tracking).
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface GlowPosition {
  x: number;
  y: number;
}

export function useMouseGlow(options?: { track?: 'self' | 'parent' }): {
  ref: React.RefObject<HTMLDivElement | null>;
  position: GlowPosition;
  visible: boolean;
} {
  const track = options?.track ?? 'self';
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<GlowPosition>({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);

  const onMouseMove = useCallback((e: MouseEvent) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const onMouseEnter = useCallback(() => setVisible(true), []);
  const onMouseLeave = useCallback(() => setVisible(false), []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // R-79 (Pass 7, M-53): with `track: 'parent'` the listeners attach to
    // the parent hero section — a `pointer-events: none` overlay can never
    // be a pointer-event target in a real browser, so listening on it made
    // the glow dead code. The overlay itself stays pointer-transparent.
    const target = track === 'parent' ? node.parentElement : node;
    if (!target) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    target.addEventListener('mousemove', onMouseMove);
    target.addEventListener('mouseenter', onMouseEnter);
    target.addEventListener('mouseleave', onMouseLeave);
    return () => {
      target.removeEventListener('mousemove', onMouseMove);
      target.removeEventListener('mouseenter', onMouseEnter);
      target.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [onMouseMove, onMouseEnter, onMouseLeave, track]);

  return { ref, position, visible };
}

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

export function useMouseGlow(): {
  ref: React.RefObject<HTMLDivElement | null>;
  position: GlowPosition;
  visible: boolean;
} {
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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    node.addEventListener('mousemove', onMouseMove);
    node.addEventListener('mouseenter', onMouseEnter);
    node.addEventListener('mouseleave', onMouseLeave);
    return () => {
      node.removeEventListener('mousemove', onMouseMove);
      node.removeEventListener('mouseenter', onMouseEnter);
      node.removeEventListener('mouseleave', onMouseLeave);
    };
  }, [onMouseMove, onMouseEnter, onMouseLeave]);

  return { ref, position, visible };
}

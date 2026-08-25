/**
 * apps/web/src/hooks/use-scroll-progress.ts — FR-1.
 *
 * Returns 0-100 based on scroll position relative to page height.
 * Throttled via requestAnimationFrame to avoid jank on 60fps scroll.
 *
 * Source of truth: landing_page_mockup.html lines 1067-1076.
 */
'use client';

import { useEffect, useState } from 'react';

export function useScrollProgress(): number {
  // Lazy initializer so the first render returns the correct value
  // (reduced-motion → static initial; else → 0, updated by the effect).
  const [progress, setProgress] = useState(() => {
    if (typeof window === 'undefined') return 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      return docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const next = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        setProgress(Math.min(100, Math.max(0, next)));
        raf = 0;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return progress;
}

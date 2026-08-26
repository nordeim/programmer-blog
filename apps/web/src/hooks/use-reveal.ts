/**
 * apps/web/src/hooks/use-reveal.ts — FR-15.
 *
 * IntersectionObserver-based scroll reveal. Attaches to a ref;
 * toggles the `.visible` class on the observed element when it
 * enters the viewport. After firing once, the observer disconnects
 * (no repeat animation).
 *
 * Source: landing_page_mockup.html lines 1178-1200 (IntersectionObserver).
 */
'use client';

import { useEffect, useRef, type RefObject } from 'react';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  threshold?: number;
  rootMargin?: string;
}): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Reduced motion → reveal immediately.
    if (prefersReducedMotion()) {
      node.classList.add('visible');
      return;
    }

    // If IntersectionObserver is unavailable, reveal immediately.
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.disconnect();
          }
        }
      },
      {
        threshold: options?.threshold ?? 0.15,
        rootMargin: options?.rootMargin ?? '0px 0px -10% 0px',
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.threshold, options?.rootMargin]);

  return ref;
}

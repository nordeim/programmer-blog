/**
 * apps/web/src/hooks/use-typewriter.ts — FR-6.
 *
 * Cycles through greetings: type → pause → delete → advance. Respects
 * prefers-reduced-motion (returns the first greeting statically). Pauses
 * (without losing state) when the tab is hidden.
 *
 * Source of truth: landing_page_mockup.html lines 1030-1065.
 */
'use client';

import { useEffect, useState } from 'react';

const TYPE_SPEED_MS = 75;
const TYPE_JITTER_MS = 50;
const DELETE_SPEED_MS = 35;
const PAUSE_AT_FULL_MS = 2200;
const PAUSE_AT_EMPTY_MS = 400;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isTabHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.hidden;
}

export function useTypewriter(words: string[]): string {
  // If prefers-reduced-motion, freeze the first greeting. We compute this
  // once on the initial render (client-side only) so we don't need a
  // setState-in-effect (which would trigger cascading renders under
  // react-hooks v7's set-state-in-effect rule).
  const [frozen] = useState(() =>
    typeof window !== 'undefined' && prefersReducedMotion() ? (words[0] ?? '') : '',
  );

  const [text, setText] = useState('');
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  // R-89 (Pass 7, L-52): bumped by the visibilitychange listener below so
  // the typing effect re-runs when the tab becomes visible again. While
  // hidden, the effect's empty 200ms retry never advanced any state, so
  // the machine slept forever after the first tab-hide.
  const [wakeTick, setWakeTick] = useState(0);

  // Wake on visibility change. setState inside an EVENT handler (not in
  // the effect body) — allowed under react-hooks v7's set-state-in-effect
  // rule, which targets synchronous effect-body cascades.
  useEffect(() => {
    function onVisibilityChange(): void {
      if (!document.hidden) setWakeTick((t) => t + 1);
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Reduced motion: short-circuit. The main effect below returns early when
  // reduced motion is on, so the typing machinery is dormant.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (words.length === 0) return;

    const word = words[index % words.length] ?? '';

    // If the tab is hidden, retry in 200ms without advancing.
    if (isTabHidden()) {
      const t = setTimeout(() => {
        // The component will re-render via state changes; the effect re-runs.
      }, 200);
      return () => clearTimeout(t);
    }

    // Type forward.
    if (!deleting) {
      if (text === word) {
        // Pause at full word, then start deleting.
        const t = setTimeout(() => setDeleting(true), PAUSE_AT_FULL_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setText(word.slice(0, text.length + 1));
      }, TYPE_SPEED_MS + Math.random() * TYPE_JITTER_MS);
      return () => clearTimeout(t);
    }

    // Delete backward.
    if (deleting) {
      if (text === '') {
        // Pause at empty, then advance to the next word. Deferring the
        // state changes inside the timeout avoids a synchronous
        // set-state-in-effect (which triggers cascading renders per
        // react-hooks v7's rule) AND matches the mockup's pause-then-advance
        // behavior more faithfully.
        const t = setTimeout(() => {
          setDeleting(false);
          setIndex((i) => (i + 1) % words.length);
        }, PAUSE_AT_EMPTY_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setText(word.slice(0, text.length - 1));
      }, DELETE_SPEED_MS);
      return () => clearTimeout(t);
    }
  }, [text, deleting, index, words, wakeTick]);

  // If reduced-motion froze a greeting, return that; else return the
  // typed/deleted text. This is the value the consumer renders.
  return frozen || text;
}

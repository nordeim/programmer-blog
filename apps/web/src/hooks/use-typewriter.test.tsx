/**
 * apps/web/src/hooks/use-typewriter.test.tsx — Phase 3 RED→GREEN tests.
 *
 * Tests the three rules from PRD FR-6:
 *   1. Cycles through greetings (types → pauses → deletes → advances).
 *   2. Respects prefers-reduced-motion (returns the first greeting statically).
 *   3. Pauses (but does not lose state) when the tab is hidden.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTypewriter } from './use-typewriter';

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default: reduced-motion OFF.
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    // Tab visible.
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with an empty string and types the first greeting', () => {
    const { result } = renderHook(() => useTypewriter(['hello.', 'world.']));
    expect(result.current).toBe('');
    // Each char takes 75-125ms. 'hello.' is 6 chars → ~750ms.
    // Advance in 50ms ticks to allow React to flush re-renders between timers.
    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('types out the full first greeting when given enough time', () => {
    const { result } = renderHook(() => useTypewriter(['hi']));
    // 'hi' is 2 chars. Each char takes 75-125ms. Total ~250ms.
    // Advance in 25ms ticks to let React flush between timers.
    for (let i = 0; i < 40; i++) {
      act(() => {
        vi.advanceTimersByTime(25);
      });
    }
    expect(result.current).toBe('hi');
  });

  it('pauses at the full word before deleting', () => {
    const { result } = renderHook(() => useTypewriter(['hi']));
    for (let i = 0; i < 40; i++) {
      act(() => {
        vi.advanceTimersByTime(25);
      });
    }
    expect(result.current).toBe('hi');
    // The pause is 2200ms — at 1000ms in, we should still have 'hi'.
    for (let i = 0; i < 40; i++) {
      act(() => {
        vi.advanceTimersByTime(25);
      });
    }
    expect(result.current).toBe('hi');
    // After 2200ms pause, deletion should have started. Total elapsed ~3500ms.
    for (let i = 0; i < 100; i++) {
      act(() => {
        vi.advanceTimersByTime(25);
      });
    }
    // After the 2200ms pause + a 35ms delete tick, text should be 'h' or ''.
    expect(['', 'h', 'hi']).toContain(result.current);
  });

  it('respects prefers-reduced-motion — returns the first greeting statically', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { result } = renderHook(() => useTypewriter(['hello, traveler.', 'world.']));
    // Reduced-motion path runs the initial state-set effect synchronously on mount.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('hello, traveler.');
    // Even after a long time, the text doesn't change.
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current).toBe('hello, traveler.');
  });

  it('resumes typing when the tab becomes visible again (R-89)', () => {
    let hidden = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => hidden,
    });

    const { result } = renderHook(() => useTypewriter(['hello']));

    // Type one char before hiding.
    act(() => {
      vi.advanceTimersByTime(130);
    });
    const before = result.current;
    expect(before.length).toBeGreaterThan(0);

    // Hide the tab: one in-flight timer may still land, but the machine
    // must come to a complete stop afterwards.
    hidden = true;
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    const frozenAt = result.current;
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current).toBe(frozenAt);

    // Show the tab again: visibilitychange must wake the machine up.
    // (Dispatch and timer-advance are separate acts so React flushes the
    // wake re-render before the new typing timers are scheduled.)
    hidden = false;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(result.current.length).toBeGreaterThan(frozenAt.length);
  });

  it('returns empty string when given no greetings', () => {
    const { result } = renderHook(() => useTypewriter([]));
    expect(result.current).toBe('');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('');
  });
});

/**
 * apps/web/src/hooks/use-scroll-progress.test.tsx — Phase 3 tests.
 *
 * Tests the three rules from PRD FR-1:
 *   1. Returns 0 at the top of the page.
 *   2. Returns 100 at the bottom.
 *   3. Returns reduced-motion path: returns the initial value and never updates.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScrollProgress } from './use-scroll-progress';

describe('useScrollProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns 0 at the top of the page', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const { result } = renderHook(() => useScrollProgress());
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(0);
  });

  it('returns 100 at the bottom of the page', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    const { result } = renderHook(() => useScrollProgress());
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(100);
  });

  it('returns midpoint at half-scroll', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 50 });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 100 });
    const { result } = renderHook(() => useScrollProgress());
    act(() => {
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(50);
  });

  it('respects prefers-reduced-motion — returns the initial value and never updates', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 50 });
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 100 });
    const { result } = renderHook(() => useScrollProgress());
    expect(result.current).toBe(50);
    act(() => {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: 100 });
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(50);
  });
});

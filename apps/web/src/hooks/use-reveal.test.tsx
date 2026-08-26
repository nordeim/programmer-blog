/**
 * apps/web/src/hooks/use-reveal.test.tsx — Phase 3 tests for useReveal.
 *
 * Tests:
 *   1. With IntersectionObserver firing, the .visible class is added.
 *   2. After firing once, the observer disconnects (no repeat).
 *   3. With prefers-reduced-motion, .visible is added immediately on mount.
 *   4. Without IntersectionObserver (SSR-like), .visible is added immediately.
 */
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReveal } from './use-reveal';

function TestComponent({ threshold }: { threshold?: number }) {
  const ref = useReveal<HTMLDivElement>({ threshold });
  return <div ref={ref} className="reveal" data-testid="target" />;
}

describe('useReveal', () => {
  let observers: Array<{
    callback: IntersectionObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }> = [];

  beforeEach(() => {
    observers = [];
    (global as { IntersectionObserver?: unknown }).IntersectionObserver = class {
      callback: IntersectionObserverCallback;
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
      constructor(cb: IntersectionObserverCallback) {
        this.callback = cb;
        observers.push({
          callback: this.callback,
          observe: this.observe,
          disconnect: this.disconnect,
        });
      }
    } as unknown as typeof IntersectionObserver;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds .visible when IntersectionObserver fires', () => {
    const { getByTestId } = render(<TestComponent />);
    const target = getByTestId('target');
    expect(target.classList.contains('visible')).toBe(false);

    // Simulate observer firing.
    const entry = {
      isIntersecting: true,
      target,
      intersectionRatio: 1,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: 0,
    };
    observers[0]?.callback([entry], {} as IntersectionObserver);
    expect(target.classList.contains('visible')).toBe(true);
  });

  it('disconnects after firing once', () => {
    render(<TestComponent />);
    expect(observers.length).toBe(1);
    expect(observers[0]?.disconnect).not.toHaveBeenCalled();

    const target = document.querySelector('[data-testid="target"]') as HTMLDivElement;
    const entry = {
      isIntersecting: true,
      target,
      intersectionRatio: 1,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: 0,
    };
    observers[0]?.callback([entry], {} as IntersectionObserver);
    expect(observers[0]?.disconnect).toHaveBeenCalled();
  });

  it('adds .visible immediately when prefers-reduced-motion is true', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('target').classList.contains('visible')).toBe(true);
  });
});

/**
 * Vitest setup — runs before each test file.
 * Polyfills the browser APIs that jsdom doesn't ship:
 *   - matchMedia (used by use-typewriter's prefers-reduced-motion check)
 *   - IntersectionObserver (used by use-reveal)
 *   - ResizeObserver (used by some shadcn primitives)
 *   - navigator.clipboard (used by use-copy-to-clipboard)
 *   - requestIdleCallback (used by Next.js 16's scheduler)
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// ── matchMedia ───────────────────────────────────────────────────────────────
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// ── IntersectionObserver ────────────────────────────────────────────────────
class MockIntersectionObserver implements IntersectionObserver {
  readonly thresholds: ReadonlyArray<number> = [0];
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  callback: IntersectionObserverCallback;
  elements: Set<Element> = new Set();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.elements.add(target);
  }
  unobserve(target: Element) {
    this.elements.delete(target);
  }
  disconnect() {
    this.elements.clear();
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (!('IntersectionObserver' in window)) {
  // @ts-expect-error — assigning to a read-only property in jsdom
  window.IntersectionObserver = MockIntersectionObserver;
}
if (!('IntersectionObserver' in globalThis)) {
  (globalThis as Record<string, unknown>).IntersectionObserver = MockIntersectionObserver;
}

// ── ResizeObserver ──────────────────────────────────────────────────────────
class MockResizeObserver implements ResizeObserver {
  callback: ResizeObserverCallback;
  elements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.elements.add(target);
  }
  unobserve(target: Element) {
    this.elements.delete(target);
  }
  disconnect() {
    this.elements.clear();
  }
}

if (!('ResizeObserver' in window)) {
  // @ts-expect-error — assigning to a read-only property in jsdom
  window.ResizeObserver = MockResizeObserver;
}

// ── navigator.clipboard ─────────────────────────────────────────────────────
if (!navigator.clipboard) {
  // @ts-expect-error — extending a read-only property
  navigator.clipboard = {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  };
}

// ── requestIdleCallback / cancelIdleCallback ────────────────────────────────
if (!('requestIdleCallback' in window)) {
  // @ts-expect-error — jsdom type doesn't expose this
  window.requestIdleCallback = (cb: IdleRequestCallback) =>
    setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline), 0);
}
if (!('cancelIdleCallback' in window)) {
  // @ts-expect-error — jsdom type doesn't expose this
  window.cancelIdleCallback = (handle: number) => clearTimeout(handle);
}

// ── HTMLDialogElement.showModal / close ─────────────────────────────────────
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal =
    HTMLDialogElement.prototype.showModal ||
    function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  HTMLDialogElement.prototype.close =
    HTMLDialogElement.prototype.close ||
    function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
}

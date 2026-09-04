/**
 * apps/web/src/features/landing/hero-mouse-glow.test.tsx — R-79 (Pass 7, M-53).
 *
 * Composition regression test. The glow overlay is intentionally
 * `pointer-events: none` (it must never block hero links), so in a real
 * browser it can never BE the target of pointer events — the listeners
 * must live on the parent hero section. The old unit test missed the bug
 * because jsdom dispatches directly on the node (no hit-testing).
 */
import { fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HeroMouseGlow } from './hero-mouse-glow';

describe('HeroMouseGlow composition — R-79 (M-53)', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function renderInHero() {
    const { container } = render(
      <section data-testid="hero">
        <HeroMouseGlow />
      </section>,
    );
    const hero = container.querySelector('[data-testid="hero"]') as HTMLElement;
    const glow = container.querySelector('.mouse-glow') as HTMLElement;
    return { hero, glow };
  }

  it('the overlay stays pointer-transparent so hero links stay clickable', () => {
    const { glow } = renderInHero();
    // pointer-events:none lives on the glow's wrapper — the glow inherits
    // the inertness (with no hit-testing in jsdom, this composition pin
    // is what keeps the wrapper from ever becoming the event target).
    const wrapper = glow.parentElement as HTMLElement;
    expect(wrapper.style.pointerEvents).toBe('none');
  });

  it('tracks the pointer over the HERO SECTION (not the inert overlay)', () => {
    const { hero, glow } = renderInHero();

    fireEvent.mouseEnter(hero);
    fireEvent.mouseMove(hero, { clientX: 42, clientY: 24 });

    // Positions are relative to the tracking element's bounds (jsdom
    // rects are 0) — the contract is that the section events REACH the hook.
    expect(glow.style.opacity).toBe('1');
    expect(glow.style.left).toBe('42px');
    expect(glow.style.top).toBe('24px');

    fireEvent.mouseLeave(hero);
    expect(glow.style.opacity).toBe('0');
  });

  it('ignores pointer events that never reach the hero (overlay is inert)', () => {
    const { glow } = renderInHero();
    fireEvent.mouseEnter(glow);
    expect(glow.style.opacity).toBe('0');
  });
});

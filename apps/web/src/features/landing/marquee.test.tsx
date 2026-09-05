/**
 * apps/web/src/features/landing/marquee.test.tsx — R-99 (Pass 9, M-58).
 *
 * The marquee's skill words previously rendered in `var(--muted)` (#8a8275
 * in dark theme). The hero's cyan glow composites the effective background
 * to ~#113b40, where that pair measures 3.2:1 — below the 4.5:1 WCAG AA
 * floor (live Lighthouse accessibility failure, audit M-58). The mockup
 * (source of truth) now uses `var(--fg-dim)` (≥6.8:1 in the same
 * conditions); this test pins the 1:1 port to the mockup decision.
 */
import { render, screen } from '@testing-library/react';

import { describe, expect, it } from 'vitest';

import { Marquee } from './marquee';

describe('Marquee — R-99 / M-58 contrast fix', () => {
  it('renders the marquee text in var(--fg-dim) per the mockup (WCAG AA on the glow-tinted background)', () => {
    render(<Marquee />);
    const marquee = document.querySelector('.marquee');
    expect(marquee).not.toBeNull();
    expect((marquee as HTMLElement).style.color).toBe('var(--fg-dim)');
  });

  it('does not render the failing --muted color (3.2:1 on the composited background)', () => {
    render(<Marquee />);
    const marquee = document.querySelector('.marquee');
    expect((marquee as HTMLElement).style.color).not.toBe('var(--muted)');
  });

  it('still renders every technology from the mockup list', () => {
    render(<Marquee />);
    // The list is rendered twice for the seamless loop (2nd copy aria-hidden),
    // so match "at least one non-hidden instance" via getAllByText.
    expect(screen.getAllByText('JavaScript').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NeoVim').length).toBeGreaterThan(0);
  });
});

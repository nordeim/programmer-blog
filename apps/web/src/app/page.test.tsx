/**
 * apps/web/src/app/page.test.tsx — Phase 1 smoke test (RED→GREEN target).
 *
 * Tests that the home page renders and contains the "/dev/log" logotype.
 * This is the first failing test we wrote in Phase 1; running `pnpm test`
 * before page.tsx exists fails (RED). After page.tsx is created, this
 * passes (GREEN).
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import HomePage from './page';

describe('HomePage (Phase 1 smoke)', () => {
  it('renders the /dev/log logotype', () => {
    const { container } = render(<HomePage />);
    // The logotype is rendered visibly in the <h1>.
    const heading = container.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading?.textContent ?? '').toMatch(/dev/);
    expect(heading?.textContent ?? '').toMatch(/log/);
  });

  it('exposes a hidden logotype marker for stable test querying', () => {
    render(<HomePage />);
    const marker = screen.getByTestId('logotype-marker');
    expect(marker.textContent).toBe('/dev/log');
  });

  it('renders the blinking cursor element', () => {
    const { container } = render(<HomePage />);
    const cursor = container.querySelector('.logo-cursor');
    expect(cursor).not.toBeNull();
  });

  it('uses the "main" landmark for accessibility (skip-link target)', () => {
    render(<HomePage />);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });
});

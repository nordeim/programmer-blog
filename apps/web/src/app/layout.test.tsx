/**
 * apps/web/src/app/layout.test.tsx — RootLayout font wiring (R-10).
 *
 * Asserts that the root layout wires the three self-hosted fonts
 * (Fraunces / JetBrains Mono / Space Grotesk) via next/font/local, so no
 * Google Fonts request is ever made (H-3 audit finding).
 *
 * React DOM refuses to render <html> inside a test container div, so we
 * inspect the element tree the async server component returns instead.
 */
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

// next/font/local is a Next.js build-time macro — mock it and pass the
// declared CSS variable name through so we can assert wiring.
vi.mock('next/font/local', () => ({
  default: (opts: { variable: string }) => ({
    variable: `mocked-${opts.variable}`,
    className: 'mocked-next-font',
  }),
}));

// Mock the cookie jar (RootLayout is a server component reading cookies).
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ get: () => undefined }),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
  },
}));

import RootLayout from './layout';

function propsOf(node: unknown): Record<string, unknown> {
  const el = node as ReactElement<Record<string, unknown>>;
  expect(el).toBeTruthy();
  expect(typeof el.type).toBe('string');
  return el.props;
}

describe('RootLayout self-hosted fonts (R-10)', () => {
  it('applies the Fraunces, JetBrains Mono and Space Grotesk variable classes to <html>', async () => {
    const ui = await RootLayout({ children: <p>hi</p> });
    const props = propsOf(ui);
    expect(props['data-theme']).toBe('dark');
    const cls = String(props.className ?? '');
    expect(cls).toContain('--font-fraunces');
    expect(cls).toContain('--font-jetbrains-mono');
    expect(cls).toContain('--font-space-grotesk');
  });

  it('renders the <html> root element with lang="en"', async () => {
    const ui = await RootLayout({ children: <p>hi</p> });
    const props = propsOf(ui);
    expect((ui as ReactElement).type).toBe('html');
    expect(props.lang).toBe('en');
  });
});

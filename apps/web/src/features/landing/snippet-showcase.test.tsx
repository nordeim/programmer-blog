/**
 * apps/web/src/features/landing/snippet-showcase.test.tsx — R-53 (Pass 5, M-42).
 *
 * Mobile horizontal-scroll regression: on a 390px viewport the landing
 * page scrolled horizontally (scrollWidth 484 vs 390). The
 * snippet-showcase grid children (`lg:col-span-4` / `lg:col-span-8`)
 * lacked `min-w-0`, so the `.code-window pre` block (white-space: pre)
 * contributed a ~460px min-content width to the single-column mobile
 * grid track.
 *
 * The mockup (`landing_page_mockup.html`) is the source of truth — the
 * fix lands there first and this test pins the 1:1 port:
 *   - grid children carry `min-w-0` in BOTH the mockup and the port;
 *   - a `.code-window pre { overflow-x: auto; }` rule exists in BOTH
 *     the mockup <style> and globals.css.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SnippetShowcase } from './snippet-showcase';

const REPO_ROOT = resolve(__dirname, '../../../../..');
const MOCKUP_PATH = resolve(REPO_ROOT, 'landing_page_mockup.html');
const GLOBALS_PATH = resolve(__dirname, '../../app/globals.css');

describe('SnippetShowcase — R-53 (M-42 mobile grid blowout)', () => {
  it('renders min-w-0 on both grid children', () => {
    const { container } = render(<SnippetShowcase />);
    const children = container.querySelectorAll('.grid > div');
    expect(children.length).toBe(2);
    for (const child of children) {
      expect(child.className).toContain('min-w-0');
    }
  });

  it('ports min-w-0 to the mockup grid children (mockup parity)', () => {
    const mockup = readFileSync(MOCKUP_PATH, 'utf8');
    expect(mockup).toContain('class="lg:col-span-4 lg:sticky min-w-0"');
    expect(mockup).toContain('class="lg:col-span-8 min-w-0"');
  });

  it('has a scrollable pre rule in globals.css AND the mockup (parity)', () => {
    const globals = readFileSync(GLOBALS_PATH, 'utf8');
    const mockup = readFileSync(MOCKUP_PATH, 'utf8');
    expect(globals).toMatch(/\.code-window pre\s*\{[^}]*overflow-x:\s*auto/s);
    expect(mockup).toMatch(/\.code-window pre\s*\{[^}]*overflow-x:\s*auto/s);
  });
});

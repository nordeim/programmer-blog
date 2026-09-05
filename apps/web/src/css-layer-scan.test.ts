/**
 * apps/web/src/css-layer-scan.test.ts — R-98 (Pass 9, H-44).
 *
 * Source-scan regression test for the CSS cascade-layer contract.
 *
 * Tailwind v4 emits utility classes (.hidden, .sm:inline-flex, …) inside
 * `@layer utilities`. Per CSS cascade layers, UNLAYERED styles beat layered
 * styles at equal specificity — so any component class in globals.css that
 * sets `display` must live inside `@layer components`, or responsive
 * display utilities (`hidden`, `sm:inline-flex`, `md:inline-block`, …)
 * silently stop working (audit H-44: the GitHub pill rendered on mobile and
 * clipped the cyber theme button off the 390px viewport; the live build's
 * CSS contained `.hidden{display:none}` while the pill still computed
 * `display:flex`).
 *
 * The file's own header has claimed "@layer components structure" since the
 * mockup port — this scan makes that claim load-bearing.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const GLOBALS_CSS = resolve(__dirname, './app/globals.css');

/** Component classes that set `display` — these MUST be inside the layer. */
const DISPLAY_COMPONENT_CLASSES = [
  '.stat-pill',
  '.tag',
  '.btn-primary',
  '.btn-secondary',
  '.theme-btn',
] as const;

/**
 * Extract the body of the `@layer components { … }` block (brace-matched),
 * or null when the file declares no such layer.
 */
function extractLayerComponentsBody(css: string): string | null {
  const start = css.search(/@layer\s+components\s*\{/);
  if (start < 0) return null;
  const openBrace = css.indexOf('{', start);
  let depth = 0;
  for (let i = openBrace; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(openBrace + 1, i);
    }
  }
  return null;
}

/**
 * True when `selector {` appears at the TOP LEVEL of `css` (i.e. not inside
 * the captured layer body). We approximate by removing the layer body and
 * checking the remainder.
 */
function selectorExistsOutsideLayer(css: string, layerBody: string | null, selector: string): boolean {
  const remainder = layerBody === null ? css : css.replace(layerBody, '');
  // `.stat-pill {` / `.stat-pill,` / `.stat-pill:hover {` — the base rule.
  const re = new RegExp(`^${escapeRegExp(selector)}\\s*[,{]`, 'm');
  return re.test(remainder);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('CSS cascade-layer contract — R-98 / H-44', () => {
  const css = readFileSync(GLOBALS_CSS, 'utf8');

  it('declares an @layer components block (the documented structure)', () => {
    expect(extractLayerComponentsBody(css)).not.toBeNull();
  });

  it.each(DISPLAY_COMPONENT_CLASSES)(
    'defines %s inside @layer components so Tailwind display utilities win',
    (selector) => {
      const layerBody = extractLayerComponentsBody(css);
      expect(layerBody).not.toBeNull();
      // The base rule must exist inside the layer…
      const re = new RegExp(`^${escapeRegExp(selector)}\\s*[,{]`, 'm');
      expect(re.test(layerBody as string)).toBe(true);
      // …and must NOT survive unlayered (unlayered would beat @layer utilities).
      expect(selectorExistsOutsideLayer(css, layerBody, selector)).toBe(false);
    },
  );

  it('keeps the display rules that make hidden sm:inline-flex / hidden md:inline-block work', () => {
    // The whole point of R-98: these two live call sites (github-pill.tsx,
    // archive-item.tsx) rely on utilities overriding the component class.
    const layerBody = extractLayerComponentsBody(css);
    expect(layerBody).not.toBeNull();
    expect((layerBody as string).match(/\.stat-pill\s*\{[\s\S]*?display:\s*inline-flex/)).not.toBeNull();
    expect((layerBody as string).match(/\.tag\s*\{[\s\S]*?display:\s*inline-block/)).not.toBeNull();
  });
});

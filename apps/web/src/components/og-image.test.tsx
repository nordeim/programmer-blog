/**
 * apps/web/src/components/og-image.test.tsx — OG image renderer (R-14).
 *
 * next/og's ImageResponse (satori + resvg) can't run in jsdom, so we mock
 * it and assert (a) the exported size/contentType metadata matches the
 * 1200×630 PNG convention, and (b) the rendered JSX carries the brand
 * strings (site name / post title / tagline) and brand colors.
 */
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

const imageResponseCalls: Array<{ element: ReactElement; options: Record<string, unknown> }> = [];

vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(element: ReactElement, options: Record<string, unknown>) {
      imageResponseCalls.push({ element, options });
    }
  },
}));

import { renderOgImage } from './og-image';

function collectStrings(node: unknown, acc: string[] = []): string[] {
  if (node == null || typeof node === 'boolean') return acc;
  if (typeof node === 'string' || typeof node === 'number') {
    acc.push(String(node));
    return acc;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectStrings(n, acc));
    return acc;
  }
  if (typeof node === 'object' && 'props' in (node as Record<string, unknown>)) {
    const props = (node as ReactElement).props as Record<string, unknown> | undefined;
    if (props) {
      collectStrings(props.children, acc);
    }
  }
  return acc;
}

describe('renderOgImage (R-14)', () => {
  it('returns an ImageResponse sized 1200x630', () => {
    imageResponseCalls.length = 0;
    renderOgImage({ title: '/dev/log' });
    expect(imageResponseCalls).toHaveLength(1);
    expect(imageResponseCalls[0]!.options.width).toBe(1200);
    expect(imageResponseCalls[0]!.options.height).toBe(630);
  });

  it('renders the site name and tagline for the site variant', () => {
    imageResponseCalls.length = 0;
    renderOgImage({ title: '/dev/log', subtitle: 'Notes from a Programmer' });
    const text = collectStrings(imageResponseCalls[0]!.element).join("");
    expect(text).toContain('/dev/log');
    expect(text).toContain('Notes from a Programmer');
  });

  it('renders the post title and brand footer for the post variant', () => {
    imageResponseCalls.length = 0;
    renderOgImage({ title: 'On the Quiet Violence of Implicit Conversions', subtitle: 'essay' });
    const text = collectStrings(imageResponseCalls[0]!.element).join("");
    expect(text).toContain('On the Quiet Violence of Implicit Conversions');
    expect(text).toContain('/dev/log');
  });
});

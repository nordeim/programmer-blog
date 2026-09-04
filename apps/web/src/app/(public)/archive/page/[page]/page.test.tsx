/**
 * apps/web/src/app/(public)/archive/page/[page]/page.test.ts —
 * R-78 (Pass 7, M-52) + Pass 7 testing-gap closure.
 *
 * The paged archive shim previously had no test at all and inherited the
 * root layout's `canonical: '/'`, telling crawlers every paginated
 * archive URL was a duplicate of the homepage.
 */
import { describe, expect, it } from 'vitest';

import { metadata } from './page';

describe('archive paged route metadata — R-78 (M-52)', () => {
  it('declares its own canonical URL', () => {
    expect(metadata.alternates?.canonical).toBe('/archive');
  });

  it('keeps the archive title (no homepage inheritance)', () => {
    expect(metadata.title).toBe('Archive — /dev/log');
  });
});

/**
 * apps/web/src/lib/pagination.test.ts — TDD RED+GREEN for paginate().
 *
 * Covers:
 *   - single-page (no pager)
 *   - empty DB (zero items)
 *   - happy path (50 items, page 3, pageSize 10)
 *   - boundary clamp (page 99 of 5 → page 5)
 *   - ellipsis insertion (large archive)
 *   - buildPageHref preserves tag/query and strips page=1
 */
import { describe, expect, it } from 'vitest';

import { buildPageHref, paginate } from './pagination';

describe('paginate', () => {
  it('returns hasMultiple=false when items fit one page', () => {
    const r = paginate({ currentPage: 1, totalItems: 5, pageSize: 10 });
    expect(r.totalPages).toBe(1);
    expect(r.hasMultiple).toBe(false);
    expect(r.pages).toEqual([1]);
    expect(r.prev).toBeNull();
    expect(r.next).toBeNull();
    expect(r.from).toBe(1);
    expect(r.to).toBe(5);
  });

  it('treats an empty DB as page 1 of 1 with from=0 to=0', () => {
    const r = paginate({ currentPage: 1, totalItems: 0, pageSize: 10 });
    expect(r.totalPages).toBe(1);
    expect(r.from).toBe(0);
    expect(r.to).toBe(0);
    expect(r.hasMultiple).toBe(false);
  });

  it('computes correct from/to and prev/next for the middle of the archive', () => {
    const r = paginate({ currentPage: 3, totalItems: 50, pageSize: 10 });
    expect(r.totalPages).toBe(5);
    expect(r.currentPage).toBe(3);
    expect(r.from).toBe(21);
    expect(r.to).toBe(30);
    expect(r.prev).toBe(2);
    expect(r.next).toBe(4);
    expect(r.showPrev).toBe(true);
    expect(r.showNext).toBe(true);
  });

  it('clamps an out-of-range currentPage to the last page', () => {
    const r = paginate({ currentPage: 99, totalItems: 50, pageSize: 10 });
    expect(r.currentPage).toBe(5);
    expect(r.next).toBeNull();
    expect(r.prev).toBe(4);
  });

  it('clamps a NaN / 0 currentPage to page 1', () => {
    const r = paginate({ currentPage: Number.NaN, totalItems: 50, pageSize: 10 });
    expect(r.currentPage).toBe(1);
    const r0 = paginate({ currentPage: 0, totalItems: 50, pageSize: 10 });
    expect(r0.currentPage).toBe(1);
  });

  it('renders ellipsis markers when totalPages exceeds maxVisible', () => {
    const r = paginate({
      currentPage: 25,
      totalItems: 1000,
      pageSize: 10,
      siblings: 1,
      maxVisible: 7,
    });
    expect(r.totalPages).toBe(100);
    // Should always include page 1, page 100, current±1, and ellipsis markers (-1).
    expect(r.pages[0]).toBe(1);
    expect(r.pages[r.pages.length - 1]).toBe(100);
    expect(r.pages).toContain(-1);
    expect(r.pages).toContain(24);
    expect(r.pages).toContain(25);
    expect(r.pages).toContain(26);
  });
});

describe('buildPageHref', () => {
  it('strips page=1 to the bare basePath', () => {
    const href = buildPageHref('/archive', { tag: 'javascript' }, 1);
    expect(href).toBe('/archive?tag=javascript');
  });

  it('appends page when > 1', () => {
    const href = buildPageHref('/archive', { tag: 'rust' }, 2);
    expect(href).toBe('/archive?tag=rust&page=2');
  });

  it('preserves multi-value search params', () => {
    const href = buildPageHref('/archive', { tag: ['rust', 'go'] }, 2);
    expect(href).toBe('/archive?tag=rust&tag=go&page=2');
  });

  it('drops empty / undefined params', () => {
    const href = buildPageHref('/archive', { tag: undefined, q: '' }, 2);
    expect(href).toBe('/archive?page=2');
  });

  it('handles empty search params', () => {
    const href = buildPageHref('/archive', {}, 1);
    expect(href).toBe('/archive');
  });
});

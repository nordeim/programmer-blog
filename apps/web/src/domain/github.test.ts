/**
 * apps/web/src/domain/github.test.ts — Phase 3 tests for formatNumber.
 */
import { describe, expect, it } from 'vitest';

import { FALLBACK_FORKS, FALLBACK_STARS, formatNumber } from './github';

describe('formatNumber', () => {
  it('renders small numbers without a suffix', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(999)).toBe('999');
  });

  it('renders thousands with k suffix', () => {
    expect(formatNumber(1500)).toBe('1.5k');
    expect(formatNumber(82400)).toBe('82.4k');
    expect(formatNumber(100000)).toBe('100k');
  });

  it('renders millions with M suffix', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(2_500_000)).toBe('2.5M');
  });

  it('exposes sane fallback constants', () => {
    expect(FALLBACK_STARS).toBeGreaterThan(0);
    expect(FALLBACK_FORKS).toBeGreaterThan(0);
    expect(typeof FALLBACK_STARS).toBe('number');
  });
});

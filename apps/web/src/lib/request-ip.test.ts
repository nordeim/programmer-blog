/**
 * apps/web/src/lib/request-ip.test.ts — R-40 (Pass 4, H-35).
 *
 * Pins the contract for deriving the real client IP from proxy headers
 * server-side, so the comment/subscribe/login rate limiters key on the
 * actual requester instead of a shared fallback bucket (postId / email).
 */
import { describe, expect, it } from 'vitest';

import { getClientIpFromHeaders } from './request-ip';

type Getter = (name: string) => string | null;

function headersFrom(map: Record<string, string>): { get: Getter } {
  return { get: (name: string) => map[name.toLowerCase()] ?? null };
}

describe('getClientIpFromHeaders — R-40', () => {
  it('returns the first x-forwarded-for entry (single value)', () => {
    const h = headersFrom({ 'x-forwarded-for': '203.0.113.7' });
    expect(getClientIpFromHeaders(h)).toBe('203.0.113.7');
  });

  it('returns the first x-forwarded-for entry (comma-separated chain)', () => {
    const h = headersFrom({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' });
    expect(getClientIpFromHeaders(h)).toBe('203.0.113.7');
  });

  it('trims surrounding whitespace from the entry', () => {
    const h = headersFrom({ 'x-forwarded-for': '  203.0.113.7  , 70.41.3.18' });
    expect(getClientIpFromHeaders(h)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const h = headersFrom({ 'x-real-ip': '198.51.100.23' });
    expect(getClientIpFromHeaders(h)).toBe('198.51.100.23');
  });

  it('returns "unknown" when no proxy headers are present', () => {
    expect(getClientIpFromHeaders(headersFrom({}))).toBe('unknown');
  });

  it('returns "unknown" for an empty x-forwarded-for value', () => {
    const h = headersFrom({ 'x-forwarded-for': '' });
    expect(getClientIpFromHeaders(h)).toBe('unknown');
  });
});

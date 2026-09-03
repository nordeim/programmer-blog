/**
 * apps/web/src/lib/log.test.ts — maskEmail / logError (R-19).
 */
import { describe, expect, it, vi } from 'vitest';

import { logError, maskEmail } from './log';

describe('maskEmail (R-19)', () => {
  it('masks the local part of a normal email', () => {
    expect(maskEmail('alex@devlog.example')).toBe('a***@devlog.example');
    expect(maskEmail('someone@gmail.com')).toBe('s***@gmail.com');
  });

  it('keeps the single char local part and appends ***', () => {
    expect(maskEmail('a@b.co')).toBe('a***@b.co');
  });

  it('returns (no email) for null/undefined/empty/non-string', () => {
    expect(maskEmail(null)).toBe('(no email)');
    expect(maskEmail(undefined)).toBe('(no email)');
    expect(maskEmail('')).toBe('(no email)');
    expect(maskEmail(42)).toBe('(no email)');
  });

  it('returns (invalid email) for malformed strings', () => {
    expect(maskEmail('no-at-sign')).toBe('(invalid email)');
    expect(maskEmail('@domain.com')).toBe('(invalid email)');
    expect(maskEmail('local@')).toBe('(invalid email)');
  });
});

describe('logError', () => {
  it('logs scope, message and extra via console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logError('scope', err, { email: 'a***@b.co' });
    expect(spy).toHaveBeenCalledWith('[scope]', 'boom', { email: 'a***@b.co' });
    spy.mockRestore();
  });

  it('stringifies non-Error values', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('db', 'raw failure');
    expect(spy).toHaveBeenCalledWith('[db]', 'raw failure', {});
    spy.mockRestore();
  });
});

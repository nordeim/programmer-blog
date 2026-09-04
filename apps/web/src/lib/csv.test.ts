/**
 * apps/web/src/lib/csv.test.ts — R-45 (Pass 4, M-38).
 *
 * Pins the CSV cell-escaping contract, including the formula-injection
 * guard: spreadsheet applications execute cells whose value begins with
 * =, +, - or @, so those must be neutralized with a leading apostrophe.
 */
import { describe, expect, it } from 'vitest';

import { csvEscape } from './csv';

describe('csvEscape — R-45 / M-38', () => {
  it('returns null/undefined as an empty string', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('leaves plain values untouched', () => {
    expect(csvEscape('hello@world.com')).toBe('hello@world.com');
    expect(csvEscape('confirmed')).toBe('confirmed');
    expect(csvEscape('2026-09-04')).toBe('2026-09-04');
  });

  it('quotes values containing commas, quotes or newlines', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralizes formula-injection leading characters with an apostrophe', () => {
    expect(csvEscape('=1+1')).toBe("'=1+1");
    expect(csvEscape('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(csvEscape('-2+3')).toBe("'-2+3");
    expect(csvEscape('@cmd')).toBe("'@cmd");
  });

  it('neutralizes dangerous characters inside quoted values too', () => {
    expect(csvEscape('=a,"b')).toBe('"\'=a,""b"');
  });
});

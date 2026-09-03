/**
 * apps/web/src/app/fonts.test.ts — self-hosted font files (R-10, H-3).
 *
 * Guards the acceptance gate: the woff2 files MUST exist in the repo and
 * the total MUST stay under 250KB so no runtime Google Fonts request is
 * ever needed.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const fontsDir = join(__dirname, 'fonts');

describe('self-hosted fonts (R-10)', () => {
  it('ships the 5 required woff2 files', () => {
    const expected = [
      'fraunces-latin-var.woff2',
      'fraunces-latin-italic-400.woff2',
      'jetbrains-mono-latin-var.woff2',
      'jetbrains-mono-latin-italic-400.woff2',
      'space-grotesk-latin-var.woff2',
    ];
    for (const f of expected) {
      expect(existsSync(join(fontsDir, f)), `${f} must exist`).toBe(true);
    }
  });

  it('keeps total font payload under 250KB', () => {
    const files = readdirSync(fontsDir).filter((f) => f.endsWith('.woff2'));
    const total = files.reduce((acc, f) => acc + statSync(join(fontsDir, f)).size, 0);
    expect(files.length).toBe(5);
    expect(total).toBeLessThan(250 * 1024);
  });

  it('uses valid woff2 files (magic bytes: wOF2)', () => {
    const files = readdirSync(fontsDir).filter((f) => f.endsWith('.woff2'));
    for (const f of files) {
      const buf = readFileSync(join(fontsDir, f));
      expect(buf.subarray(0, 4).toString('ascii')).toBe('wOF2');
    }
  });
});

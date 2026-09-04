/**
 * apps/web/src/tailwind-convention-scan.test.ts — R-90 (Pass 7, L-53).
 *
 * Source-scan regression test: the documented convention (AGENTS.md
 * "Tailwind v4") forbids arbitrary literal values like `text-[#abc]` or
 * `min-h-[60vh]` — arbitrary `var()` references ARE allowed because they
 * reference `@theme` tokens. This scan fails if a pixel/viewport literal
 * utility sneaks back in.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_ROOT = resolve(__dirname, './');

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc);
    } else if (/\.(tsx)$/.test(entry) && !/\.test\.(tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Tailwind arbitrary literal scan — R-90 / L-53', () => {
  it('keeps viewport/pixel literal utilities out of components', () => {
    const offenders: string[] = [];
    const pattern = /(min-h|max-h|min-w|max-w|w|h|top|left|right|bottom)-\[\d+(px|vh|vw)\]/;
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const contents = readFileSync(file, 'utf8');
      for (const [i, line] of contents.split('\n').entries()) {
        if (pattern.test(line)) {
          offenders.push(`${file.replace(`${SRC_ROOT}/`, '')}:${i + 1}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

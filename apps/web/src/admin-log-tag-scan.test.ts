/**
 * apps/web/src/admin-log-tag-scan.test.ts — R-100 (Pass 9).
 *
 * Source-scan prevention pin: every `console.*` tag in Server Action files
 * must be a well-formed `[scope] message` string. The Pass 9 audit briefly
 * flagged `moderateComment` for a corrupted tag (`'oderateComment] …`) and
 * RETRACTED it at byte level (`od -c` shows the correct
 * `'[moderateComment] DB error'` — the initial sighting was a terminal-
 * rendering misread, the exact I-17 lesson from Pass 8). The scan ships
 * anyway as a regression pin so a future corrupted tag cannot land.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ACTIONS_DIR = resolve(__dirname, './features');

function collectActionFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) {
      collectActionFiles(full, acc);
    } else if (entry === 'actions.ts') {
      acc.push(full);
    }
  }
  return acc;
}

describe('Server Action log-tag scan — R-100 prevention pin', () => {
  it('moderateComment keeps the well-formed [moderateComment] tag', () => {
    const source = readFileSync(resolve(ACTIONS_DIR, './admin/actions.ts'), 'utf8');
    expect(source).toContain("console.error('[moderateComment] DB error'");
    // The corrupted form must never return.
    expect(source).not.toMatch(/console\.error\('[a-z][^[]/);
  });

  it('every console tag in features/*/actions.ts starts with an opening bracket', () => {
    const offenders: string[] = [];
    const re = /console\.(error|warn|log|info)\(\s*'([^']*)'/g;
    for (const file of collectActionFiles(ACTIONS_DIR)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(re)) {
        const tag = match[2] ?? '';
        if (!tag.startsWith('[')) {
          offenders.push(`${file.replace(`${ACTIONS_DIR}/`, '')}: '${tag}'`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

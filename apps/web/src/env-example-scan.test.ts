/**
 * apps/web/src/env-example-scan.test.ts — R-72 (Pass 7, C-41).
 *
 * Source-scan regression test: every tracked `*.example` env template at
 * the repo root must contain ONLY placeholder values. C-41 was a
 * production-faithful secret set (64-hex secrets, the real site URL, a
 * filled author password) tracked under the `.example` extension, which
 * put live-looking credentials one `git clone` away from every reader.
 *
 * The contract, in plain terms:
 *  - no 64-char hex blob (an openssl-generated secret),
 *  - no real deployment host,
 *  - no filled DEV_AUTHOR_PASSWORD.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPO_ROOT = resolve(__dirname, '../../../');

const TEMPLATE_FILES = ['.env.example', '.env.local.example'];

describe('env templates are placeholder-only — R-72 / C-41', () => {
  for (const name of TEMPLATE_FILES) {
    it(`${name} contains no real secrets`, () => {
      let contents: string;
      try {
        contents = readFileSync(resolve(REPO_ROOT, name), 'utf8');
      } catch {
        // A template may legitimately be removed from the repo; absence
        // trivially satisfies the contract.
        return;
      }

      const offenders: string[] = [];
      for (const line of contents.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        if (/[0-9a-f]{64}/i.test(line)) {
          offenders.push(`64-hex secret: ${trimmed.slice(0, 30)}…`);
        }
        if (/programmer-blog\.jesspete\.shop/.test(line)) {
          offenders.push(`real deployment host: ${trimmed.slice(0, 40)}…`);
        }
        if (/^DEV_AUTHOR_PASSWORD=.+/.test(trimmed)) {
          offenders.push('filled DEV_AUTHOR_PASSWORD');
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});

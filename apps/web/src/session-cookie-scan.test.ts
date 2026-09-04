/**
 * apps/web/src/session-cookie-scan.test.ts — R-42 (Pass 4, M-35).
 *
 * Source-scan regression test: the literal cookie name 'devlog_session'
 * must appear NOWHERE in apps/web/src — the name is owned by the
 * SESSION_COOKIE constant exported from @devlog/auth/tokens (re-exported
 * via @/lib/auth). Hardcoding the string couples every call site to the
 * cookie name and was already the root cause of M-33 in Pass 3.
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
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('SESSION_COOKIE constant usage — R-42 / M-35', () => {
  it("never hardcodes the 'devlog_session' literal in apps/web/src", () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const contents = readFileSync(file, 'utf8');
      if (contents.includes('devlog_session')) {
        offenders.push(file.replace(`${SRC_ROOT}/`, ''));
      }
    }
    expect(offenders).toEqual([]);
  });
});

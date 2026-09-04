/**
 * apps/web/src/server-action-ip-scan.test.ts — R-58 (Pass 6, H-39).
 *
 * Source-scan regression test: Server Action files must NOT accept a
 * client-supplied `ctx.ip` (or any `ip` in a caller-controlled argument).
 *
 * Server Action arguments are attacker-serializable over the network —
 * `createComment(input, { ip })` / `subscribeToNewsletter(input, { ip })`
 * let a caller rotate a fake IP per request and fully bypass the per-IP
 * rate limits (audit H-39). The real client IP must always come from
 * proxy headers via `getClientIpFromHeaders(await headers())`.
 *
 * Pattern: mirrors `use-server-exports-scan.test.ts` (R-48).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const ACTION_FILES = [
  resolve(__dirname, 'features/blog/actions.ts'),
  resolve(__dirname, 'features/subscribe/actions.ts'),
  resolve(__dirname, 'features/admin/actions.ts'),
  resolve(__dirname, 'features/auth/actions.ts'),
] as const;

describe('server actions derive the rate-limit key server-side — R-58 / H-39', () => {
  it('never reads a client-controlled ip argument in a "use server" file', () => {
    const offenders: string[] = [];
    for (const file of ACTION_FILES) {
      const contents = readFileSync(file, 'utf8');
      const lines = contents.split('\n');
      let inBlockComment = false;
      for (let i = 0; i < lines.length; i++) {
        const trimmed = (lines[i] ?? '').trim();
        if (inBlockComment) {
          if (trimmed.includes('*/')) inBlockComment = false;
          continue;
        }
        if (trimmed.startsWith('/*')) {
          inBlockComment = !trimmed.includes('*/');
          continue;
        }
        if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;
        // `ctx.ip`, `ctx?.ip`, `ip: string`, `{ ip?: string }` — any of these
        // mean the action trusts a caller-supplied address.
        if (/\bctx\s*\??\.\s*ip\b/.test(trimmed) || /\{\s*ip\s*\??\s*:/.test(trimmed)) {
          offenders.push(`${file}:${i + 1} — ${trimmed}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('still reads the IP from proxy headers (the legitimate path stays wired)', () => {
    for (const file of [ACTION_FILES[0], ACTION_FILES[1]]) {
      const contents = readFileSync(file, 'utf8');
      expect(contents).toContain('getClientIpFromHeaders');
      expect(contents).toContain('headers()');
    }
  });
});

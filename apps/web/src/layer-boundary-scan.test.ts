/**
 * apps/web/src/layer-boundary-scan.test.ts — R-63 (Pass 6, M-47).
 *
 * Source-scan regression test for the two golden-rule directions the
 * repo previously had no enforcement for (the 5-layer contract lives in
 * AGENTS.md / CLAUDE.md; proxy and 'use server' boundaries already have
 * their own scan tests):
 *
 *   1. lib/ (Layer 4) must not import UP into features/ (Layer 2).
 *      Pre-R-63 `lib/blog.ts` imported `ArchiveItemData` from
 *      `features/landing/archive-preview` and `lib/mdx.tsx` imported
 *      `defaultMDXComponents` from `features/blog/mdx-components`,
 *      creating lib→features inversions and a feature↔lib cycle
 *      (features/blog/post-page → lib/mdx → features/blog/mdx-components).
 *
 *   2. features/ must not import other features' internals.
 *      Pre-R-63 `features/blog/archive-list.tsx` imported
 *      `features/landing/archive-item` + `archive-preview` types.
 *
 * Shared code belongs in domain/ (pure types) or components/ (shared
 * primitives). Pattern: mirrors `use-server-exports-scan.test.ts` (R-48).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

function stripCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/^\s*\*.*$/gm, '');
}

describe('layer boundaries — R-63 / M-47', () => {
  it('lib/ never imports from features/ (Layer 4 → Layer 2 inversion)', () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(join(SRC_ROOT, 'lib'))) {
      const contents = stripCommentsAndStrings(readFileSync(file, 'utf8'));
      const re = /from\s+['"]@\/features\/[^'"]+['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(contents)) !== null) {
        offenders.push(`${file.replace(`${SRC_ROOT}/`, '')} — ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("features/ never import other features' internals (public API modules excepted)", () => {
    // R-63 nuance: a feature's `actions.ts` / `schemas.ts` are its PUBLIC
    // API (Server Actions must be callable from client components, and
    // the landing subscribe form calls features/subscribe/actions — the
    // documented as-built pattern). Internal modules (components, hooks,
    // helpers) stay private to the owning feature.
    const PUBLIC_API_SEGMENT = /\/(actions|schemas)$/;
    const offenders: string[] = [];
    for (const file of collectSourceFiles(join(SRC_ROOT, 'features'))) {
      const normalized = file.replace(/\\/g, '/');
      const owner = normalized.match(/features\/([^/]+)\//)?.[1];
      if (!owner) continue;
      const contents = stripCommentsAndStrings(readFileSync(file, 'utf8'));
      const re = /from\s+['"]@\/features\/([^/'"]+)(\/[^'"]*)?['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(contents)) !== null) {
        const target = m[1] ?? '';
        const segment = m[2] ?? '';
        if (target === owner) continue;
        if (PUBLIC_API_SEGMENT.test(segment)) continue;
        offenders.push(
          `${file.replace(`${SRC_ROOT}/`, '')} imports another feature's internals — ${m[0]}`,
        );
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the scan actually sees the previously-offending files (layout guard)', () => {
    const files = collectSourceFiles(SRC_ROOT).map((f) => f.replace(`${SRC_ROOT}/`, ''));
    expect(files).toContain(join('lib', 'blog.ts'));
    expect(files).toContain(join('lib', 'mdx.tsx'));
    expect(files).toContain(join('features', 'blog', 'archive-list.tsx'));
    expect(files).toContain(join('features', 'landing', 'archive-preview.tsx'));
  });
});

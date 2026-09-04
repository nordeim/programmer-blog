/**
 * apps/web/src/use-server-exports-scan.test.ts — R-48 (Pass 5, C-37).
 *
 * Source-scan regression test: every file that opts into the Server
 * Actions contract (`'use server'`) must export ONLY async functions.
 *
 * Next.js 16 rejects any non-async export (a Zod schema object, a
 * constant, a class) at module-evaluation time when the action is first
 * invoked — the whole action surface 500s with
 * `A "use server" file can only export async functions, found object.`
 * (audit C-37: createComment, createPost, updatePost, deletePost,
 * moderateComment and updateSiteSettings were all dead in production
 * because three Zod schema objects sat in 'use server' files).
 *
 * Shared schemas live in plain modules instead:
 *   - `@devlog/types` (createCommentInputSchema, R-18)
 *   - `features/admin/schemas.ts` (admin schemas, R-48)
 *
 * Pattern: mirrors `session-cookie-scan.test.ts` (R-42).
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

/** Matches value exports that are NOT async functions and NOT type-only. */
const NON_ASYNC_EXPORT_RE =
  /^export (const|let|var|class|function(?!\s*async)\s)[^\n]*(?:\n(?!\n)[^\n]*)*?\{?/gm;

describe("'use server' files export only async functions — R-48 / C-37", () => {
  it('never exports non-async values from a "use server" module', () => {
    const offenders: string[] = [];
    for (const file of collectSourceFiles(SRC_ROOT)) {
      const contents = readFileSync(file, 'utf8');
      if (!contents.includes("'use server'") && !contents.includes('"use server"')) {
        continue;
      }
      // The directive must also be a top-level directive, not part of a comment.
      if (!/^\s*['"]use server['"];/m.test(contents)) continue;

      const lines = contents.split('\n');
      let inBlockComment = false;
      let currentExport: { kind: string; line: number; name: string } | null = null;

      // First pass: collect locally-defined exported async functions so a
      // legal `export { someAsyncAction }` re-export is not flagged.
      const locallyExportedAsyncFns = new Set<string>();
      for (const line of lines) {
        const m = line.trim().match(
          /^(?:export\s+)?async\s+function\s+([A-Za-z0-9_$]+)/,
        );
        if (m?.[1] && /^\s*export\s+async\s+function/.test(line)) locallyExportedAsyncFns.add(m[1]);
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        const trimmed = line.trim();

        // Track block comments so commented-out exports are ignored.
        if (inBlockComment) {
          if (trimmed.includes('*/')) inBlockComment = false;
          continue;
        }
        if (trimmed.startsWith('/*')) {
          inBlockComment = !trimmed.includes('*/');
          continue;
        }
        if (trimmed.startsWith('*') || trimmed.startsWith('//')) continue;

        // Finish a multiline export when we hit a line ending the declaration.
        if (currentExport) {
          const isAsyncFn = currentExport.kind === 'async-function';
          const declarationEnded = /[=;]\s*$/.test(trimmed) || trimmed.endsWith('{');
          if (isAsyncFn || declarationEnded || trimmed === '') {
            if (!isAsyncFn) {
              offenders.push(
                `${file.replace(`${SRC_ROOT}/`, '')}:${currentExport.line} ` +
                  `exports ${currentExport.kind} '${currentExport.name}' from a 'use server' file`,
              );
            }
            currentExport = null;
          }
        }

        const exportMatch = trimmed.match(
          /^export\s+(async\s+function|function|const|let|var|class)\s+([A-Za-z0-9_$]+)/,
        );
        if (!exportMatch) {
          // Re-export braces: `export { a, b as c };` — every binding is a
          // value export; only re-exports of locally-defined async fns are
          // legal in a 'use server' file.
          const braceMatch = trimmed.match(/^export\s*\{([^}]*)\}/);
          if (braceMatch?.[1]) {
            const bindings = braceMatch[1]
              .split(',')
              .map((b) => b.trim().split(/\s+as\s+/)[0]?.trim())
              .filter((b): b is string => Boolean(b));
            for (const binding of bindings) {
              if (!locallyExportedAsyncFns.has(binding)) {
                offenders.push(
                  `${file.replace(`${SRC_ROOT}/`, '')}:${i + 1} re-exports '${binding}' from a 'use server' file (not an async function)`,
                );
              }
            }
          }
          continue;
        }
        const kind = exportMatch[1];
        const name = exportMatch[2];
        if (kind === 'async function') continue; // the only legal value export
        if (kind === 'function') {
          // `export function foo()` — synchronous function: illegal as a value export.
          offenders.push(
            `${file.replace(`${SRC_ROOT}/`, '')}:${i + 1} exports ${kind} '${name}' from a 'use server' file`,
          );
          continue;
        }
        // Value export (const/let/var/class) — may span multiple lines.
        currentExport = { kind, line: i + 1, name };
      }

      if (currentExport) {
        offenders.push(
          `${file.replace(`${SRC_ROOT}/`, '')}:${currentExport.line} ` +
            `exports ${currentExport.kind} '${currentExport.name}' from a 'use server' file`,
        );
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps a whitelist-free contract: the scan actually covers the action files', () => {
    // Guard against the scan silently passing because the directory
    // layout changed: the two known action files must be found.
    const files = collectSourceFiles(SRC_ROOT).map((f) => f.replace(`${SRC_ROOT}/`, ''));
    expect(files).toContain(join('features', 'blog', 'actions.ts'));
    expect(files).toContain(join('features', 'admin', 'actions.ts'));
    expect(files).toContain(join('features', 'auth', 'actions.ts'));
    expect(files).toContain(join('features', 'subscribe', 'actions.ts'));
  });
});

// Keep the regex import referenced (documentation of intent for future editors).
void NON_ASYNC_EXPORT_RE;

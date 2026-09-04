/**
 * @devlog/email — dependency-manifest scan (R-95, Pass 8 C-42).
 *
 * `react-email` is the React Email **preview CLI**. Nothing in the
 * workspace imports it and no script runs it — declaring it as a
 * runtime dependency dragged `next@15.1.2` (plus vulnerable esbuild /
 * glob / @babel/core / prismjs / postcss / sharp resolutions) into the
 * PROD dependency graph, which `pnpm audit --prod` flags and the
 * `pnpm check` gate blocks on (audit C-42).
 *
 * This scan pins the manifest: the CLI must never return to
 * `dependencies`; the actual render libraries must stay.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(resolve(here, '..', 'package.json'), 'utf8'),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('email package manifest (R-95, C-42)', () => {
  it('never declares the react-email preview CLI as a runtime dependency', () => {
    expect(manifest.dependencies ?? {}).not.toHaveProperty('react-email');
  });

  it('keeps the render libraries (@react-email/components + @react-email/render)', () => {
    expect(manifest.dependencies).toHaveProperty('@react-email/components');
    expect(manifest.dependencies).toHaveProperty('@react-email/render');
  });
});

/**
 * apps/web/src/scripts/copy-standalone-assets.test.ts — R-33 (Pass 3).
 *
 * Pins the C-34 deploy regression: Next.js `output: 'standalone'` never
 * copies `.next/static` (client chunks) or `public/` into the standalone
 * folder — the official deploy step. The live deployment skipped it, so
 * every `/_next/static/*` URL 404'd and the landing page rendered as
 * unstyled raw HTML. The postbuild script must make
 * `pnpm build && pnpm start` self-contained.
 */
import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const SCRIPT = resolve(__dirname, 'copy-standalone-assets.ts');

async function run(root: string) {
  return exec('node', [
    '--import',
    'tsx',
    SCRIPT,
    '--root',
    root,
  ]);
}

function seedFakeBuild(root: string, opts: { withPublic?: boolean } = {}) {
  // Fake client chunk output.
  const staticDir = join(root, '.next', 'static', 'chunks');
  mkdirSync(staticDir, { recursive: true });
  writeFileSync(join(staticDir, 'app.css'), 'body{color:hotpink}');
  // Fake standalone output (server only, no static dir — the Next.js default).
  const standaloneNext = join(root, '.next', 'standalone', 'apps', 'web', '.next');
  mkdirSync(standaloneNext, { recursive: true });
  writeFileSync(join(standaloneNext, 'server.js'), '// server');
  if (opts.withPublic) {
    const publicDir = join(root, 'public');
    mkdirSync(publicDir, { recursive: true });
    writeFileSync(join(publicDir, 'robots.txt'), 'User-agent: *\nAllow: /');
  }
}

describe('copy-standalone-assets — R-33 / C-34', () => {
  it('copies .next/static into the standalone .next/static', async () => {
    const root = mkdtempSync(join(tmpdir(), 'standalone-'));
    seedFakeBuild(root);

    await run(root);

    const copied = join(
      root,
      '.next',
      'standalone',
      'apps',
      'web',
      '.next',
      'static',
      'chunks',
      'app.css',
    );
    expect(existsSync(copied)).toBe(true);
    expect(readFileSync(copied, 'utf8')).toBe('body{color:hotpink}');
  });

  it('copies public/ into the standalone root when present', async () => {
    const root = mkdtempSync(join(tmpdir(), 'standalone-'));
    seedFakeBuild(root, { withPublic: true });

    await run(root);

    const copied = join(root, '.next', 'standalone', 'apps', 'web', 'public', 'robots.txt');
    expect(existsSync(copied)).toBe(true);
  });

  it('is idempotent — safe to re-run', async () => {
    const root = mkdtempSync(join(tmpdir(), 'standalone-'));
    seedFakeBuild(root);

    await run(root);
    await run(root);

    expect(
      existsSync(join(root, '.next', 'standalone', 'apps', 'web', '.next', 'static', 'chunks', 'app.css')),
    ).toBe(true);
  });

  it('exits 0 with a warning when there is no standalone output (dev workflow)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'standalone-'));
    // No .next at all — e.g. after `next dev` only.
    const { stderr } = await run(root);
    expect(stderr).toMatch(/no standalone output/i);
  });

  it('succeeds when public/ is absent (repo currently ships no public dir)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'standalone-'));
    seedFakeBuild(root, { withPublic: false });
    const { stderr } = await run(root);
    expect(stderr).toMatch(/no public dir/i);
  });
});

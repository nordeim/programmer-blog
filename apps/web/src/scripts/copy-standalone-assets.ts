/**
 * apps/web/src/scripts/copy-standalone-assets.ts — R-33 (Pass 3).
 *
 * Fixes C-34: with `output: 'standalone'`, Next.js bakes the SERVER bundle
 * into `.next/standalone/` but deliberately leaves the client assets
 * (`.next/static`) and `public/` out of it — the official deployment docs
 * require the operator to copy them in. Our deployment skipped that step,
 * so every `/_next/static/*` request 404'd and the landing page rendered
 * as unstyled raw HTML (the reported "landing page is broken" regression).
 *
 * This script runs automatically after every `pnpm build` (wired as the
 * `postbuild` npm script) so the standalone folder is self-contained and
 * `pnpm start` serves the complete app:
 *
 *   .next/static  →  .next/standalone/apps/web/.next/static   (required)
 *   public/       →  .next/standalone/apps/web/public         (optional)
 *
 * Usage:
 *   tsx src/scripts/copy-standalone-assets.ts [--root <apps-web-root>]
 *
 * `--root` exists for the integration test; in production the default
 * (the apps/web directory containing this package's .next) is used.
 * Exits 0 with a warning when there is nothing to do (e.g. plain `next
 * dev` workflows that never produce a standalone folder).
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const APP_RELATIVE_STANDALONE = path.join('.next', 'standalone', 'apps', 'web');

export interface CopyResult {
  copiedStatic: boolean;
  copiedPublic: boolean;
  warnings: string[];
}

function resolveAppRoot(argv: string[]): string {
  const rootFlagIndex = argv.indexOf('--root');
  if (rootFlagIndex !== -1) {
    const value = argv[rootFlagIndex + 1];
    if (!value) throw new Error('--root requires a value');
    return path.resolve(value);
  }
  // Default: this file lives at <apps/web>/src/scripts/, so the app root
  // is two levels up. (ESM: no __dirname — derive from import.meta.url,
  // same convention as src/scripts/migrate.ts.)
  const here = fileURLToPath(new URL('.', import.meta.url));
  return path.resolve(here, '..', '..');
}

export function copyStandaloneAssets(appRoot: string): CopyResult {
  const warnings: string[] = [];
  const standaloneDir = path.join(appRoot, APP_RELATIVE_STANDALONE);
  const standaloneNext = path.join(standaloneDir, '.next');

  if (!existsSync(standaloneDir)) {
    warnings.push(
      '[postbuild] No standalone output at .next/standalone — skipping asset copy (normal for `next dev`).',
    );
    return { copiedStatic: false, copiedPublic: false, warnings };
  }

  // 1. Client chunks: .next/static → standalone/.next/static
  const staticSrc = path.join(appRoot, '.next', 'static');
  const staticDst = path.join(standaloneNext, 'static');
  if (existsSync(staticSrc)) {
    rmSync(staticDst, { recursive: true, force: true });
    cpSync(staticSrc, staticDst, { recursive: true });
  } else {
    warnings.push('[postbuild] No .next/static found — nothing to copy.');
  }

  // 2. Public dir: public/ → standalone/public (the repo ships none today,
  //    but the copy keeps future public assets deploy-safe).
  const publicSrc = path.join(appRoot, 'public');
  const publicDst = path.join(standaloneDir, 'public');
  if (existsSync(publicSrc)) {
    rmSync(publicDst, { recursive: true, force: true });
    cpSync(publicSrc, publicDst, { recursive: true });
  } else {
    warnings.push('[postbuild] No public dir — skipping public copy.');
  }

  return { copiedStatic: existsSync(staticDst), copiedPublic: existsSync(publicDst), warnings };
}

// CLI entry point (skipped when imported by the test suite).
const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const appRoot = resolveAppRoot(process.argv);
  const result = copyStandaloneAssets(appRoot);
  for (const w of result.warnings) console.warn(w);
  console.log(
    `[postbuild] standalone assets: static=${result.copiedStatic} public=${result.copiedPublic} (root: ${appRoot})`,
  );
}

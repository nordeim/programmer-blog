/**
 * apps/web/src/revalidate-contract.test.ts — R-49 + R-52 (Pass 5).
 *
 * Module-contract source scan: pages that bake absolute URLs into their
 * prerendered HTML must revalidate periodically so a fresh deploy
 * self-heals its metadata from the runtime environment instead of
 * serving build-machine URLs (e.g. `http://localhost:3000` canonicals)
 * forever.
 *
 *   R-49 (H-37): posts/[slug] prerenders via generateStaticParams with no
 *   revalidate — canonical/og:url/og:image served the build machine's
 *   localhost default live. The admin login page canonical had the same
 *   class of issue via the root layout's metadataBase.
 *
 *   R-52 (M-41): robots.txt is force-static with revalidate=86400 — the
 *   live `Sitemap:` line advertised the build-time URL for up to 24h.
 *   Feeds (rss.xml, sitemap.xml) already revalidate hourly; robots.txt
 *   now matches (3600).
 *
 * Pattern: mirrors session-cookie-scan.test.ts / use-server-exports-scan.test.ts.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_ROOT = resolve(__dirname, './');

const REVALIDATE_TARGETS: { file: string; reason: string }[] = [
  {
    file: join('app', '(public)', 'posts', '[slug]', 'page.tsx'),
    reason: 'R-49/H-37 — prerendered post metadata (canonical/OG) must self-heal',
  },
  {
    file: join('app', '(auth)', 'admin', 'login', 'page.tsx'),
    reason: 'R-49/H-37 — login-page canonical inherits the layout metadataBase',
  },
  {
    file: join('app', 'api', 'robots.txt', 'route.ts'),
    reason: 'R-52/M-41 — robots.txt Sitemap line must track the runtime site URL',
  },
];

const REVALIDATE = 'export const revalidate = 3600;';

describe('revalidate contract on prerendered URL-bearing surfaces — R-49/R-52', () => {
  for (const { file, reason } of REVALIDATE_TARGETS) {
    it(`declares hourly revalidate in ${file} (${reason})`, () => {
      const contents = readFileSync(join(SRC_ROOT, file), 'utf8');
      expect(contents).toContain(REVALIDATE);
    });
  }

  it('robots.txt no longer revalidates on the 24h cadence (R-52)', () => {
    const contents = readFileSync(
      join(SRC_ROOT, join('app', 'api', 'robots.txt', 'route.ts')),
      'utf8',
    );
    expect(contents).not.toContain('export const revalidate = 86400;');
  });
});

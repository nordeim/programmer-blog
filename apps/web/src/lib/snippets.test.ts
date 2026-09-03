/**
 * apps/web/src/lib/snippets.test.ts — MDX snippet reader.
 *
 * CONTENT_DIR is computed at module load from SNIPPETS_DIR, so the env
 * must be set BEFORE the dynamic import below.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const fixtureDir = join(tmpdir(), 'devlog-snippets-test');

type SnippetsModule = typeof import('./snippets');
let mod: SnippetsModule;

beforeAll(async () => {
  rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(fixtureDir, { recursive: true });
  writeFileSync(
    join(fixtureDir, 'use-scroll-progress.mdx'),
    [
      '# Use Scroll Progress',
      '',
      'A hook that tracks how far the user has scrolled.',
      '',
      'More body text follows.',
      '',
      '```js',
      'const x = 1;',
      '```',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(fixtureDir, 'no-title.mdx'),
    ['just some prose without a heading', '', 'second line'].join('\n'),
  );
  writeFileSync(join(fixtureDir, 'ignored.txt'), 'not a snippet');
  process.env.SNIPPETS_DIR = fixtureDir;
  mod = await import('./snippets');
});

afterAll(() => {
  delete process.env.SNIPPETS_DIR;
  rmSync(fixtureDir, { recursive: true, force: true });
});

describe('listSnippets', () => {
  it('lists only .mdx files, sorted by filename', async () => {
    mod.__resetSnippetCache();
    const list = await mod.listSnippets();
    expect(list.map((s) => s.slug)).toEqual(['no-title', 'use-scroll-progress']);
  });

  it('extracts the title from the H1 and falls back to the slug', async () => {
    mod.__resetSnippetCache();
    const list = await mod.listSnippets();
    const withTitle = list.find((s) => s.slug === 'use-scroll-progress');
    expect(withTitle?.title).toBe('Use Scroll Progress');
    const withoutTitle = list.find((s) => s.slug === 'no-title');
    expect(withoutTitle?.title).toBe('no-title');
  });

  it('extracts the first paragraph after the H1 as the excerpt', async () => {
    mod.__resetSnippetCache();
    const list = await mod.listSnippets();
    const withTitle = list.find((s) => s.slug === 'use-scroll-progress');
    expect(withTitle?.excerpt).toBe('A hook that tracks how far the user has scrolled.');
  });

  it('caches the list between calls', async () => {
    mod.__resetSnippetCache();
    await mod.listSnippets();
    const again = await mod.listSnippets();
    expect(again.length).toBe(2);
  });

  it('returns [] when the content dir is missing', async () => {
    mod.__resetSnippetCache();
    process.env.SNIPPETS_DIR = join(tmpdir(), 'does-not-exist-xyz');
    try {
      // Re-import with the new env so CONTENT_DIR picks it up.
      vi.resetModules();
      const fresh = await import('./snippets');
      const list = await fresh.listSnippets();
      expect(list).toEqual([]);
    } finally {
      vi.resetModules();
      process.env.SNIPPETS_DIR = fixtureDir;
      mod = await import('./snippets');
    }
  });
});

describe('getSnippetBySlug', () => {
  it('finds a snippet by slug', async () => {
    mod.__resetSnippetCache();
    const snippet = await mod.getSnippetBySlug('use-scroll-progress');
    expect(snippet?.slug).toBe('use-scroll-progress');
    expect(snippet?.content).toContain('# Use Scroll Progress');
  });

  it('returns null for an unknown slug', async () => {
    mod.__resetSnippetCache();
    expect(await mod.getSnippetBySlug('missing')).toBeNull();
  });
});

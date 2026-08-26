/**
 * apps/web/src/lib/snippets.ts — read snippet MDX files from
 * `apps/web/content/snippets/*.mdx` on the server.
 *
 * Returns the slug, title (extracted from the first `# Heading`),
 * and raw MDX body for each snippet. Server-only.
 *
 * Falls back to an empty list when the directory doesn't exist (so
 * the snippets page renders gracefully in environments where the
 * content folder wasn't shipped — e.g. some serverless builds).
 */
import 'server-only';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

export interface SnippetMeta {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
}

const CONTENT_DIR =
  process.env.SNIPPETS_DIR ?? join(process.cwd(), 'content', 'snippets');

let cached: SnippetMeta[] | null = null;

export async function listSnippets(): Promise<SnippetMeta[]> {
  if (cached) return cached;
  if (!existsSync(/*turbopackIgnore: true*/ CONTENT_DIR)) {
    cached = [];
    return cached;
  }
  const files = await readdir(/*turbopackIgnore: true*/ CONTENT_DIR);
  const mdxFiles = files.filter((f) => f.endsWith('.mdx')).sort();
  const result: SnippetMeta[] = [];
  for (const file of mdxFiles) {
    const slug = basename(file, '.mdx');
    const content = await readFile(`${CONTENT_DIR}/${file}`, 'utf8');
    const title = extractTitle(content) ?? slug;
    const excerpt = extractExcerpt(content) ?? '';
    result.push({ slug, title, excerpt, content });
  }
  cached = result;
  return result;
}

export async function getSnippetBySlug(slug: string): Promise<SnippetMeta | null> {
  const all = await listSnippets();
  return all.find((s) => s.slug === slug) ?? null;
}

function extractTitle(content: string): string | null {
  const match = /^#\s+(.+)$/m.exec(content);
  return match?.[1]?.trim() ?? null;
}

function extractExcerpt(content: string): string | null {
  // Skip the H1 line, then take the first non-empty paragraph.
  const lines = content.split('\n');
  let skippedH1 = false;
  let paragraph: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      if (!skippedH1) {
        skippedH1 = true;
        continue;
      }
      break;
    }
    if (trimmed === '') {
      if (paragraph.length > 0) break;
      continue;
    }
    paragraph.push(trimmed);
  }
  return paragraph.join(' ') || null;
}

/**
 * Test-only helper: clears the in-memory cache so tests can reset
 * between cases.
 */
export function __resetSnippetCache(): void {
  cached = null;
}

/**
 * apps/web/src/app/(public)/snippets/page.tsx — FR-22.
 *
 * Server component. Lists all snippets in `content/snippets/` via
 * `listSnippets()` (which reads the filesystem server-side). Renders
 * each as a `<SnippetCard>` linking to `/snippets/[slug]`.
 *
 * Source: MEP §5 Phase 5 GREEN 5.3.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { Tag } from '@/components/tag';
import { listSnippets } from '@/lib/snippets';

export const metadata: Metadata = {
  title: 'Snippets — /dev/log',
  description: 'Reusable hooks and components from the /dev/log codebase.',
};

export default async function SnippetsIndex() {
  const snippets = await listSnippets();
  return (
    <section className="py-24 md:py-32 px-6" id="snippets-page" aria-labelledby="snippets-title">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16">
          <div
            className="font-mono text-xs uppercase tracking-widest mb-4"
            style={{ color: 'var(--accent)' }}
          >
            {'//'} the snippets
          </div>
          <h1
            id="snippets-title"
            className="font-display font-black text-5xl md:text-7xl"
            style={{ letterSpacing: '-0.035em', lineHeight: 1 }}
          >
            Reusable <span style={{ fontStyle: 'italic', fontWeight: 400 }}>bits</span>
          </h1>
          <p className="text-base mt-6 max-w-xl" style={{ color: 'var(--muted)' }}>
            Small, self-contained hooks and components lifted out of the /dev/log
            codebase. Each snippet ships with usage examples and trade-offs.
          </p>
        </div>

        {snippets.length === 0 ? (
          <p
            className="font-mono text-sm py-12 text-center"
            style={{ color: 'var(--muted)' }}
          >
            no snippets published yet. check back soon.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-6" data-testid="snippet-grid">
            {snippets.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/snippets/${s.slug}`}
                  className="block py-6 px-6 border border-[var(--border)] hover:border-[var(--accent)] transition-colors h-full"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Tag>snippet</Tag>
                    <span
                      className="font-mono text-xs"
                      style={{ color: 'var(--muted)' }}
                    >
                      /snippets/{s.slug}
                    </span>
                  </div>
                  <h2
                    className="font-display text-2xl mb-2"
                    style={{ fontWeight: 700 }}
                  >
                    {s.title}
                  </h2>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--muted)' }}
                  >
                    {s.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

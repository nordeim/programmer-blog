/**
 * apps/web/src/features/landing/recent-notes.tsx — FR-8.
 *
 * Renders the 3 mockup cards verbatim. R-93 (Pass 7, L-56): the
 * landing page is a pixel-for-pixel port of the mockup BY DESIGN — the
 * optional data props exist for parity but are not wired to the DB
 * (a previous docstring claimed a DB fallback that never existed).
 * Real post listings live on /archive; /posts/[slug] serves DB posts.
 *
 * Source: landing_page_mockup.html lines 700-772.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ArticleCard } from './article-card';

export interface ArticleCardData {
  index: number;
  tag: string;
  date: string;
  readTime: string;
  title: string;
  excerpt: ReactNode;
  slug: string;
}

export const MOCKUP_RECENT_NOTES: ArticleCardData[] = [
  {
    index: 1,
    tag: 'JavaScript',
    date: '11.12.24',
    readTime: '8 min read',
    title: 'On the Quiet Violence of Implicit Conversions',
    excerpt: (
      <>
        JavaScript will let you add{' '}
        <code
          className="font-mono px-1.5 py-0.5 rounded text-xs"
          style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}
        >
          []
        </code>{' '}
        to{' '}
        <code
          className="font-mono px-1.5 py-0.5 rounded text-xs"
          style={{ background: 'rgba(var(--accent-rgb),0.1)', color: 'var(--accent)' }}
        >
          {'{}'}
        </code>{' '}
        and thank you for it. A field guide to footguns.
      </>
    ),
    slug: 'on-the-quiet-violence-of-implicit-conversions',
  },
  {
    index: 2,
    tag: 'Compilers',
    date: '10.28.24',
    readTime: '14 min read',
    title: 'A Lexer, By Hand, on a Sunday Afternoon',
    excerpt:
      'Skip the regex. Skip the generator. Two hundred lines of switch statements and you\'ll understand something new about every language you\'ve ever used.',
    slug: 'a-lexer-by-hand-on-a-sunday-afternoon',
  },
  {
    index: 3,
    tag: 'Error Handling',
    date: '10.14.24',
    readTime: '6 min read',
    title: 'Why I Removed Every Try/Catch From My Codebase',
    excerpt:
      'Result types, error channels, and the curious peace of letting things crash loudly in development.',
    slug: 'why-i-removed-every-try-catch-from-my-codebase',
  },
];

interface RecentNotesProps {
  cards?: ArticleCardData[];
}

export function RecentNotes({ cards }: RecentNotesProps = {}) {
  const data = cards && cards.length > 0 ? cards : MOCKUP_RECENT_NOTES;
  return (
    <section className="py-24 md:py-32 px-6" id="notes">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-16 flex-wrap gap-6 reveal">
          <div>
            <div
              className="font-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: 'var(--accent)' }}
            >
              {'//'} recent notes
            </div>
            <h2
              className="font-display font-black text-5xl md:text-7xl"
              style={{ letterSpacing: '-0.035em', lineHeight: 1 }}
            >
              Latest <span style={{ fontStyle: 'italic', fontWeight: 400 }}>writing</span>
            </h2>
          </div>
          <Link href="/archive" className="btn-secondary">
            all posts
            <span aria-hidden="true" className="text-xs">
              →
            </span>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {data.map((c) => (
            <ArticleCard
              key={`note-${c.slug}`}
              index={c.index}
              tag={c.tag}
              date={c.date}
              readTime={c.readTime}
              title={c.title}
              excerpt={c.excerpt}
              slug={c.slug}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

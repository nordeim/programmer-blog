/**
 * apps/web/src/features/landing/article-card.tsx — FR-8.
 *
 * The `.article-card` pattern. Wraps the entire card in a `<Link>` to
 * the post slug so the entire surface is clickable.
 *
 * Source: landing_page_mockup.html lines 717-769.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Tag } from '@/components/tag';

interface ArticleCardProps {
  index: 1 | 2 | 3 | number;
  tag: string;
  date: string;
  readTime: string;
  title: string;
  excerpt: ReactNode;
  slug: string;
}

export function ArticleCard({
  index,
  tag,
  date,
  readTime,
  title,
  excerpt,
  slug,
}: ArticleCardProps) {
  const num = String(index).padStart(2, '0');
  return (
    <article className="article-card reveal">
      <Link href={`/posts/${slug}`} className="block" style={{ textDecoration: 'none' }}>
        <div className="flex items-start justify-between mb-6">
          <div className="card-num">{num}</div>
          <Tag>{tag}</Tag>
        </div>
        <div className="font-mono text-xs mb-4" style={{ color: 'var(--muted)' }}>
          {date} — {readTime}
        </div>
        <h3 className="font-display font-bold text-2xl mb-4 leading-tight">{title}</h3>
        <p className="text-sm mb-8" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
          {excerpt}
        </p>
        <div
          className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest"
          style={{ color: 'var(--accent)' }}
        >
          <span>read essay</span>
          <span className="arrow">→</span>
        </div>
      </Link>
    </article>
  );
}

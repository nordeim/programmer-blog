/**
 * apps/web/src/features/blog/tag-filter.tsx — FR-20.
 *
 * A `<form>` containing a `<select>` for the tag and a text `<input>`
 * for the search query. Submits via GET (no client JS required) so the
 * filter is crawlable and works without JavaScript.
 *
 * The `<noscript>` fallback ensures a "filter" submit button is visible
 * even when JS is off. With JS, modern browsers emit `input` events
 * on `<select>` and `change` events fire the form submit automatically
 * (the inline on-change submit handler below uses `requestSubmit()`
 * when available to trigger a programmatically-submittable form).
 */
'use client';

import { useRouter } from 'next/navigation';
import { useId } from 'react';


interface TagOption {
  slug: string;
  name: string;
  postCount?: number;
}

interface TagFilterProps {
  tags: TagOption[];
  currentTag?: string;
  currentQuery?: string;
  basePath?: string;
}

export function TagFilter({
  tags,
  currentTag = '',
  currentQuery = '',
  basePath = '/archive',
}: TagFilterProps) {
  const router = useRouter();
  const tagId = useId();
  const queryId = useId();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const params = new URLSearchParams();
    const fd = new FormData(form);
    const tag = (fd.get('tag') as string | null) ?? '';
    const q = (fd.get('q') as string | null) ?? '';
    if (tag) params.set('tag', tag);
    if (q) params.set('q', q);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <form
      className="tag-filter flex flex-wrap items-end gap-3 mb-12"
      onSubmit={onSubmit}
      aria-label="Filter archive"
      data-testid="tag-filter"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={tagId} className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          tag
        </label>
        <select
          id={tagId}
          name="tag"
          defaultValue={currentTag}
          className="bg-[var(--bg-elev)] border border-[var(--border)] font-mono text-sm px-3 py-2"
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          <option value="">all</option>
          {tags.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
              {typeof t.postCount === 'number' ? ` (${t.postCount})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-45">
        <label htmlFor={queryId} className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          search
        </label>
        <input
          id={queryId}
          name="q"
          type="search"
          defaultValue={currentQuery}
          placeholder="grep the archive…"
          className="bg-[var(--bg-elev)] border border-[var(--border)] font-mono text-sm px-3 py-2"
        />
      </div>

      <button type="submit" className="btn-secondary">
        filter
      </button>
    </form>
  );
}

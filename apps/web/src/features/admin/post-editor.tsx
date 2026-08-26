/**
 * apps/web/src/features/admin/post-editor.tsx — FR-41.
 *
 * Client component. A textarea-based editor (CodeMirror 6 is a
 * follow-up per MEP §7 Phase 7). Title, slug, excerpt, tags,
 * publishedAt, status, MDX content. Calls `createPost` or
 * `updatePost` depending on whether `postId` is provided.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createPost, updatePost } from '@/features/admin/actions';

interface PostEditorProps {
  postId?: string;
  initialTitle?: string;
  initialSlug?: string;
  initialExcerpt?: string;
  initialContent?: string;
  initialStatus?: 'draft' | 'published' | 'archived';
  initialPublishedAt?: string;
  initialTagSlugs?: string[];
  availableTags: { slug: string; name: string }[];
}

const MAX_CONTENT = 100_000;

export function PostEditor({
  postId,
  initialTitle = '',
  initialSlug = '',
  initialExcerpt = '',
  initialContent = '',
  initialStatus = 'draft',
  initialPublishedAt = '',
  initialTagSlugs = [],
  availableTags,
}: PostEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(initialStatus);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [tagSlugs, setTagSlugs] = useState<string[]>(initialTagSlugs);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function toggleTag(slugT: string) {
    setTagSlugs((prev) =>
      prev.includes(slugT) ? prev.filter((s) => s !== slugT) : [...prev, slugT],
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const payload = {
        title,
        slug,
        excerpt,
        contentMdx: content,
        status,
        publishedAt: publishedAt || undefined,
        tagSlugs,
      };
      const result = postId
        ? await updatePost(postId, payload)
        : await createPost(payload);
      if (!result.ok) {
        setError(result.error);
        if ('fieldErrors' in result && result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        return;
      }
      router.push('/admin/posts');
      router.refresh();
    } catch (err) {
      console.error('[post-editor] submit failed', err);
      setError('Network error.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 max-w-3xl"
      data-testid="post-editor"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="pe-title" className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          title
        </label>
        <input
          id="pe-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
          disabled={submitting}
        />
        {fieldErrors.title ? (
          <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{fieldErrors.title}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="pe-slug" className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          slug
        </label>
        <input
          id="pe-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          maxLength={200}
          placeholder="auto-derived from title if empty"
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2 font-mono text-sm"
          disabled={submitting}
        />
        {fieldErrors.slug ? (
          <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{fieldErrors.slug}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="pe-excerpt" className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          excerpt
        </label>
        <textarea
          id="pe-excerpt"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
          maxLength={500}
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
          disabled={submitting}
        />
        {fieldErrors.excerpt ? (
          <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{fieldErrors.excerpt}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="pe-content" className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          content (mdx)
        </label>
        <textarea
          id="pe-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          maxLength={MAX_CONTENT}
          className="bg-[var(--code-bg)] text-[var(--code-fg)] border border-[var(--border)] px-3 py-2 font-mono text-sm resize-y"
          disabled={submitting}
        />
        <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {content.length}/{MAX_CONTENT} chars · {content.trim().split(/\s+/).length} words
        </div>
        {fieldErrors.contentMdx ? (
          <span className="font-mono text-xs" style={{ color: 'var(--accent)' }}>{fieldErrors.contentMdx}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          tags
        </span>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((t) => {
            const active = tagSlugs.includes(t.slug);
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => toggleTag(t.slug)}
                className={`tag ${active ? 'is-active' : ''}`}
                aria-pressed={active}
                style={{
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--fg)',
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pe-status" className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            status
          </label>
          <select
            id="pe-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published' | 'archived')}
            className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2 font-mono text-sm"
            disabled={submitting}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="pe-publishedAt" className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            publish date (optional)
          </label>
          <input
            id="pe-publishedAt"
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => setPublishedAt(e.target.value)}
            className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2 font-mono text-sm"
            disabled={submitting}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="font-mono text-sm" style={{ color: 'var(--accent)' }} data-testid="post-editor-error">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-secondary" disabled={submitting}>
          {submitting ? 'saving…' : postId ? 'save changes' : 'create post'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/posts')}
          className="hover-link font-mono text-sm"
          disabled={submitting}
        >
          cancel
        </button>
      </div>
    </form>
  );
}

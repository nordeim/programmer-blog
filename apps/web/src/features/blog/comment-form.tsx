/**
 * apps/web/src/features/blog/comment-form.tsx — FR-60 (MEP §5 #11).
 *
 * Client component for leaving a comment. Calls the `createComment`
 * Server Action (anonymous posting — comments land in `pending`
 * moderation; no session check by design). Includes client-side
 * validation matching the server schema (immediate feedback on
 * empty/oversized bodies) and shows server-returned errors inline.
 *
 * Requires a subscriber session (the server action verifies). If the
 * user has no session, the form is hidden and replaced with a prompt
 * to subscribe first.
 */
'use client';

import { useState } from 'react';

import { createComment } from '@/features/blog/actions';

interface CommentFormProps {
  postId: string;
  /** Show the form only when the visitor has a subscriber session. */
  canComment?: boolean;
  subscribeHref?: string;
}

const MAX_BODY = 2000;
const MIN_BODY = 3;

export function CommentForm({
  postId,
  canComment = true,
  subscribeHref = '/#about',
}: CommentFormProps) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!canComment) {
    return (
      <div
        className="py-8 px-6 border border-dashed border-[var(--border)] text-center"
        style={{ color: 'var(--muted)' }}
        data-testid="comment-form-locked"
      >
        <p className="font-mono text-sm">subscribe to leave a comment.</p>
        <a href={subscribeHref} className="hover-link font-mono text-xs mt-2 inline-block">
          subscribe →
        </a>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmed = body.trim();
    if (trimmed.length < MIN_BODY) {
      setError(`Comment must be at least ${MIN_BODY} characters.`);
      return;
    }
    if (trimmed.length > MAX_BODY) {
      setError(`Comment must be at most ${MAX_BODY} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createComment({ postId, body: trimmed });
      if (!result.ok) {
        setError(result.error ?? 'Unable to post comment.');
        return;
      }
      setSuccess(true);
      setBody('');
    } catch (err) {
      console.error('[comment-form] submit failed', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 flex flex-col gap-3"
      aria-label="Leave a comment"
      data-testid="comment-form"
    >
      <label
        htmlFor="comment-body"
        className="font-mono text-xs uppercase tracking-widest"
        style={{ color: 'var(--muted)' }}
      >
        leave a comment
      </label>
      <textarea
        id="comment-body"
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        maxLength={MAX_BODY}
        placeholder="plain text only — no markdown, no html."
        className="bg-[var(--bg-elev)] border border-[var(--border)] font-mono text-sm p-4 resize-y"
        disabled={submitting}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
          {body.length}/{MAX_BODY}
        </span>
        <button
          type="submit"
          className="btn-secondary"
          disabled={submitting || body.trim().length === 0}
        >
          {submitting ? 'posting…' : 'post comment'}
        </button>
      </div>
      {error ? (
        <p
          role="alert"
          className="font-mono text-sm"
          style={{ color: 'var(--accent)' }}
          data-testid="comment-form-error"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="font-mono text-sm"
          style={{ color: 'var(--accent-2)' }}
          data-testid="comment-form-success"
        >
          thanks. your comment is in the queue for moderation.
        </p>
      ) : null}
    </form>
  );
}

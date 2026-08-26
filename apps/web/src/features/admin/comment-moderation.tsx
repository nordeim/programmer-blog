/**
 * apps/web/src/features/admin/comment-moderation.tsx — FR-43.
 *
 * Client component. Renders pending comments with Approve / Spam /
 * Delete actions. After action completes, calls router.refresh() so
 * the server component re-fetches.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { moderateComment } from '@/features/admin/actions';
import { formatArchiveDate } from '@/lib/blog';

interface AdminComment {
  id: string;
  postId: string;
  postTitle: string;
  postSlug: string;
  parentId: string | null;
  authorName: string;
  authorEmail: string;
  body: string;
  status: 'pending' | 'approved' | 'spam' | 'deleted';
  createdAt: Date;
}

interface CommentModerationProps {
  comments: AdminComment[];
}

export function CommentModeration({ comments }: CommentModerationProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function onAction(id: string, action: 'approve' | 'spam' | 'delete') {
    setBusy(id);
    try {
      const r = await moderateComment({ commentId: id, action });
      if (!r.ok) alert(r.error);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (comments.length === 0) {
    return (
      <p className="font-mono text-sm py-12 text-center" style={{ color: 'var(--muted)' }}>
        no pending comments. inbox zero.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4" data-testid="comment-moderation-list">
      {comments.map((c) => (
        <li
          key={c.id}
          className="py-4 px-4 border border-[var(--border)]"
          style={{ background: 'var(--bg-elev)' }}
        >
          <header className="flex flex-wrap items-baseline gap-2 mb-2">
            <span className="font-mono text-sm" style={{ fontWeight: 700 }}>
              {c.authorName}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              · {c.authorEmail}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              · {formatArchiveDate(c.createdAt)}
            </span>
            <a
              href={`/posts/${c.postSlug}#comment-${c.id}`}
              className="font-mono text-xs hover-link ml-auto"
              target="_blank"
              rel="noopener noreferrer"
            >
              view on post →
            </a>
          </header>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{c.body}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAction(c.id, 'approve')}
              className="btn-secondary"
              disabled={busy === c.id}
            >
              {busy === c.id ? '…' : 'approve'}
            </button>
            <button
              type="button"
              onClick={() => onAction(c.id, 'spam')}
              className="font-mono text-xs hover-link"
              disabled={busy === c.id}
              style={{ color: 'var(--accent)' }}
            >
              mark as spam
            </button>
            <button
              type="button"
              onClick={() => onAction(c.id, 'delete')}
              className="font-mono text-xs hover-link"
              disabled={busy === c.id}
              style={{ color: 'var(--accent)' }}
            >
              delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

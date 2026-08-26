/**
 * apps/web/src/features/blog/comment-list.tsx — MEP §5 #12.
 *
 * Renders approved comments. One level of nesting is supported: a
 * `parentId` on a comment causes it to render indented under its
 * parent. Deeper nesting is flattened (children of children are
 * rendered as siblings of the parent's level — keeps the page
 * readable).
 *
 * Empty state: a short monospace note. Server component (no client
 * interactivity; the form handles posting).
 */
import type { Comment } from '@devlog/db';

interface CommentListProps {
  comments: Comment[];
  emptyMessage?: string;
}

interface CommentNode {
  comment: Comment;
  replies: Comment[];
}

function buildTree(comments: Comment[]): CommentNode[] {
  const byId = new Map(comments.map((c) => [c.id, c]));
  const roots: Comment[] = [];
  const repliesByParent = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId && byId.has(c.parentId)) {
      const arr = repliesByParent.get(c.parentId) ?? [];
      arr.push(c);
      repliesByParent.set(c.parentId, arr);
    } else {
      roots.push(c);
    }
  }
  return roots.map((r) => ({ comment: r, replies: repliesByParent.get(r.id) ?? [] }));
}

function formatDate(d: Date | number | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'number' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CommentList({
  comments,
  emptyMessage = 'no comments yet. be the first.',
}: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p
        className="font-mono text-sm py-6"
        style={{ color: 'var(--muted)' }}
        data-testid="comment-list-empty"
      >
        {emptyMessage}
      </p>
    );
  }
  const tree = buildTree(comments);
  return (
    <ul className="flex flex-col gap-6" data-testid="comment-list">
      {tree.map(({ comment, replies }) => (
        <li key={comment.id} className="comment-row">
          <CommentRow comment={comment} />
          {replies.length > 0 ? (
            <ul className="mt-3 ml-6 border-l border-[var(--border)] pl-4 flex flex-col gap-3">
              {replies.map((reply) => (
                <li key={reply.id}>
                  <CommentRow comment={reply} />
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  return (
    <article
      className="py-4 px-4 border border-[var(--border)]"
      style={{ background: 'var(--bg-elev)' }}
    >
      <header className="flex items-baseline gap-2 mb-2">
        <span className="font-mono text-sm" style={{ fontWeight: 700 }}>
          {comment.authorName}
        </span>
        <span
          className="font-mono text-xs"
          style={{ color: 'var(--muted)' }}
        >
          · {formatDate(comment.createdAt)}
        </span>
      </header>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{comment.body}</p>
    </article>
  );
}

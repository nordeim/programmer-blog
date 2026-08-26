/**
 * apps/web/src/features/admin/post-list.tsx — FR-41.
 *
 * Table of posts with row actions. Pure client component; receives
 * already-fetched posts and tags. Row actions trigger server actions
 * via Delete button + a "view" link to the editor.
 */
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { deletePost } from '@/features/admin/actions';
import { formatArchiveDate } from '@/lib/blog';

interface AdminPost {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt: Date | null;
  updatedAt: Date;
}

interface PostListProps {
  posts: AdminPost[];
}

const STATUS_LABEL: Record<AdminPost['status'], string> = {
  draft: 'draft',
  published: 'live',
  archived: 'archived',
};

export function PostList({ posts }: PostListProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    setBusy(id);
    try {
      const r = await deletePost(id);
      if (!r.ok) alert(r.error);
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (posts.length === 0) {
    return (
      <p className="font-mono text-sm py-12 text-center" style={{ color: 'var(--muted)' }}>
        no posts yet. click &ldquo;new&rdquo; to write your first.
      </p>
    );
  }

  return (
    <table className="w-full text-sm" data-testid="post-list-table">
      <thead>
        <tr className="border-b border-[var(--border)] font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          <th className="text-left py-2">Title</th>
          <th className="text-left py-2">Status</th>
          <th className="text-left py-2 hidden md:table-cell">Published</th>
          <th className="text-left py-2 hidden md:table-cell">Updated</th>
          <th className="text-right py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {posts.map((p) => (
          <tr key={p.id} className="border-b border-[var(--border)]">
            <td className="py-3 pr-3">
              <Link href={`/admin/posts/${p.id}`} className="hover-link">
                {p.title}
              </Link>
              <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
                /posts/{p.slug}
              </div>
            </td>
            <td className="py-3 pr-3">
              <span
                className="font-mono text-xs uppercase"
                style={{
                  color: p.status === 'published' ? 'var(--accent-2)' : 'var(--muted)',
                }}
              >
                {STATUS_LABEL[p.status]}
              </span>
            </td>
            <td className="py-3 pr-3 hidden md:table-cell font-mono text-xs" style={{ color: 'var(--muted)' }}>
              {formatArchiveDate(p.publishedAt)}
            </td>
            <td className="py-3 pr-3 hidden md:table-cell font-mono text-xs" style={{ color: 'var(--muted)' }}>
              {formatArchiveDate(p.updatedAt)}
            </td>
            <td className="py-3 text-right">
              <Link href={`/admin/posts/${p.id}`} className="hover-link font-mono text-xs mr-3">
                edit
              </Link>
              <button
                type="button"
                onClick={() => onDelete(p.id)}
                className="hover-link font-mono text-xs"
                disabled={busy === p.id}
                style={{ color: 'var(--accent)' }}
              >
                {busy === p.id ? 'deleting…' : 'delete'}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

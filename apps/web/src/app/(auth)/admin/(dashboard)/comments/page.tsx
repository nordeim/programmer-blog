/**
 * apps/web/src/app/(auth)/admin/comments/page.tsx — FR-43.
 *
 * Server component. Fetches pending comments, joins with posts for
 * the moderation queue.
 */
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

import { CommentModeration } from '@/features/admin/comment-moderation';
import { SESSION_COOKIE, isAuthorRequiredError, requireAuthor } from '@/lib/auth';
import { db, schema } from '@/lib/db';

export const metadata = {
  title: 'Comments — /dev/log admin',
  robots: { index: false, follow: false },
};

export default async function AdminCommentsPage() {
  const jar = await cookies();
  try {
    await requireAuthor(jar.get(SESSION_COOKIE)?.value);
  } catch (e) {
    if (isAuthorRequiredError(e)) {
      const { redirect } = await import('next/navigation');
      redirect('/admin/login');
    }
    throw e;
  }

  const pending = db
    .select()
    .from(schema.comments)
    .where(eq(schema.comments.status, 'pending'))
    .all();

  // Fetch post titles in one pass.
  const postIds = new Set(pending.map((c) => c.postId));
  const posts = postIds.size > 0
    ? db.select().from(schema.posts).all().filter((p) => postIds.has(p.id))
    : [];
  const postById = new Map(posts.map((p) => [p.id, p]));

  const items = pending.map((c) => {
    const post = postById.get(c.postId);
    return {
      id: c.id,
      postId: c.postId,
      postTitle: post?.title ?? '(unknown post)',
      postSlug: post?.slug ?? '',
      parentId: c.parentId,
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt,
    };
  });

  return (
    <div data-testid="admin-comments">
      <header className="mb-12">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} admin / comments
        </div>
        <h1
          className="font-display font-black text-3xl md:text-4xl"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          Comments
        </h1>
        <p className="font-mono text-xs mt-2" style={{ color: 'var(--muted)' }}>
          {items.length} pending · approve / spam / delete
        </p>
      </header>
      <CommentModeration comments={items} />
    </div>
  );
}

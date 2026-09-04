/**
 * apps/web/src/app/(auth)/admin/posts/page.tsx — FR-41.
 *
 * Server component. Lists all posts (drafts first, then published).
 * Each row links to the editor. Renders a "New" link in the header.
 *
 * Source: MEP §7 Phase 6 GREEN 6.3 #5.
 */
import { getAllPosts } from '@devlog/db';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { PostList } from '@/features/admin/post-list';
import { SESSION_COOKIE, isAuthorRequiredError, requireAuthor } from '@/lib/auth';


export const metadata = {
  title: 'Posts — /dev/log admin',
  robots: { index: false, follow: false },
};

export default async function AdminPostsPage() {
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

  const allPosts = await getAllPosts();
  // Sort drafts first, then published, then by updatedAt desc.
  const sorted = [...allPosts].sort((a, b) => {
    const order = { draft: 0, published: 1, archived: 2 } as const;
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  return (
    <div data-testid="admin-posts">
      <header className="mb-12 flex items-baseline justify-between">
        <div>
          <div
            className="font-mono text-xs uppercase tracking-widest mb-2"
            style={{ color: 'var(--accent)' }}
          >
            {'//'} admin / posts
          </div>
          <h1
            className="font-display font-black text-3xl md:text-4xl"
            style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
          >
            Posts
          </h1>
        </div>
        <Link href="/admin/posts/new" className="btn-secondary">
          new post →
        </Link>
      </header>
      <PostList posts={sorted} />
    </div>
  );
}

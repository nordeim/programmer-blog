/**
 * apps/web/src/app/(auth)/admin/posts/[id]/page.tsx — FR-41.
 *
 * Edit an existing post. Fetches the post + its tag slugs + all
 * available tags, then renders `<PostEditor postId=... initial...>`.
 */
import { getAllTags, getTagsForPost } from '@devlog/db';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

import { PostEditor } from '@/features/admin/post-editor';
import { SESSION_COOKIE, isAuthorRequiredError, requireAuthor } from '@/lib/auth';
import { db, schema } from '@/lib/db';


export const metadata = {
  title: 'Edit post — /dev/log admin',
  robots: { index: false, follow: false },
};

interface RouteParams {
  id: string;
}

export default async function AdminEditPostPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
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
  const { id } = await params;

  const [postRow, allTags, postTags] = await Promise.all([
    db.select().from(schema.posts).where(eq(schema.posts.id, id)).limit(1).get(),
    getAllTags(),
    getTagsForPost(id),
  ]);

  if (!postRow) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  // After notFound() TS still believes postRow may be undefined; assert it.
  const post = postRow as NonNullable<typeof postRow>;

  return (
    <div data-testid="admin-edit-post">
      <header className="mb-12">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} admin / posts / edit
        </div>
        <h1
          className="font-display font-black text-3xl md:text-4xl"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          Edit <span style={{ fontStyle: 'italic', fontWeight: 400 }}>post</span>
        </h1>
        <div className="font-mono text-xs mt-2" style={{ color: 'var(--muted)' }}>
          $ /posts/{post.slug}
        </div>
      </header>
      <PostEditor
        postId={post.id}
        initialTitle={post.title}
        initialSlug={post.slug}
        initialExcerpt={post.excerpt}
        initialContent={post.contentMdx}
        initialStatus={post.status}
        initialPublishedAt={post.publishedAt ? post.publishedAt.toISOString().slice(0, 16) : ''}
        initialTagSlugs={postTags.map((t) => t.slug)}
        availableTags={allTags.map((t) => ({ slug: t.slug, name: t.name }))}
      />
    </div>
  );
}

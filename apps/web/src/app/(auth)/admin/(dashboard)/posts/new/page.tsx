/**
 * apps/web/src/app/(auth)/admin/posts/new/page.tsx — FR-41.
 *
 * Renders the `<PostEditor>` with no initial values. Loads available
 * tags for the tag picker. Server component.
 */
import { getAllTags } from '@devlog/db';
import { cookies } from 'next/headers';

import { PostEditor } from '@/features/admin/post-editor';
import { isAuthorRequiredError, requireAuthor } from '@/lib/auth';

export const metadata = {
  title: 'New post — /dev/log admin',
  robots: { index: false, follow: false },
};

export default async function AdminNewPostPage() {
  const jar = await cookies();
  try {
    await requireAuthor(jar.get('devlog_session')?.value);
  } catch (e) {
    if (isAuthorRequiredError(e)) {
      const { redirect } = await import('next/navigation');
      redirect('/admin/login');
    }
    throw e;
  }
  const tags = await getAllTags();
  return (
    <div data-testid="admin-new-post">
      <header className="mb-12">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} admin / posts / new
        </div>
        <h1
          className="font-display font-black text-3xl md:text-4xl"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          New <span style={{ fontStyle: 'italic', fontWeight: 400 }}>post</span>
        </h1>
      </header>
      <PostEditor availableTags={tags.map((t) => ({ slug: t.slug, name: t.name }))} />
    </div>
  );
}

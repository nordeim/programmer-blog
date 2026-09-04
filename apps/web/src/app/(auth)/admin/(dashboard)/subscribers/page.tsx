/**
 * apps/web/src/app/(auth)/admin/subscribers/page.tsx — FR-42.
 *
 * Server component. Fetches all subscribers, renders SubscriberList.
 */
import { cookies } from 'next/headers';

import { SubscriberList } from '@/features/admin/subscriber-list';
import { SESSION_COOKIE, isAuthorRequiredError, requireAuthor } from '@/lib/auth';
import { db, schema } from '@/lib/db';

export const metadata = {
  title: 'Subscribers — /dev/log admin',
  robots: { index: false, follow: false },
};

export default async function AdminSubscribersPage() {
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

  const all = db.select().from(schema.subscribers).orderBy(schema.subscribers.createdAt).all();

  return (
    <div data-testid="admin-subscribers">
      <header className="mb-12">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} admin / subscribers
        </div>
        <h1
          className="font-display font-black text-3xl md:text-4xl"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          Subscribers
        </h1>
        <p className="font-mono text-xs mt-2" style={{ color: 'var(--muted)' }}>
          {all.length} total · {all.filter((s) => s.status === 'confirmed').length} confirmed ·{' '}
          {all.filter((s) => s.status === 'pending').length} pending
        </p>
      </header>
      <SubscriberList
        subscribers={all.map((s) => ({
          id: s.id,
          email: s.email,
          status: s.status,
          createdAt: s.createdAt,
          confirmedAt: s.confirmedAt,
          preferences: s.preferences,
        }))}
      />
    </div>
  );
}

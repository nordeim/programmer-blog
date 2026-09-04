/**
 * apps/web/src/app/(auth)/admin/page.tsx — Dashboard (FR-40).
 *
 * Server component. Fetches subscriber stats, post stats, comment stats,
 * and the cached GitHub stars count. Renders 4 stat cards in a grid.
 *
 * Source: MEP §7 Phase 6 GREEN 6.3 #3.
 */
import {
  getCommentStats,
  getPostStats,
  getSubscriberStats,
} from '@devlog/db';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { SESSION_COOKIE, getSession, isAuthorRequiredError, requireAuthor } from '@/lib/auth';
import { getGitHubStatsForConfiguredRepo } from '@/lib/github';

interface StatCard {
  label: string;
  value: number;
  detail: string;
  href?: string;
}

export const metadata = {
  title: 'Admin dashboard — /dev/log',
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  const jar = await cookies();
  let user;
  try {
    user = await requireAuthor(jar.get(SESSION_COOKIE)?.value);
  } catch (e) {
    if (isAuthorRequiredError(e)) {
      const { redirect } = await import('next/navigation');
      redirect('/admin/login');
    }
    throw e;
  }

  const [subs, posts, comments, ghStats] = await Promise.all([
    getSubscriberStats(),
    getPostStats(),
    getCommentStats(),
    getGitHubStatsForConfiguredRepo().catch(() => ({ stars: 0, forks: 0 })),
  ]);

  const cards: StatCard[] = [
    {
      label: 'Subscribers',
      value: subs.confirmed,
      detail: `${subs.pending} pending · ${subs.unsubscribed} unsubscribed`,
      href: '/admin/subscribers',
    },
    {
      label: 'Posts',
      value: posts.published,
      detail: `${posts.draft} draft · ${posts.archived} archived`,
      href: '/admin/posts',
    },
    {
      label: 'Comments',
      value: comments.pending,
      detail: `${comments.approved} approved · ${comments.spam} spam`,
      href: '/admin/comments',
    },
    {
      label: 'GitHub stars',
      value: ghStats.stars,
      detail: `${ghStats.forks} forks`,
    },
  ];

  return (
    <div data-testid="admin-dashboard">
      <header className="mb-12">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} admin / dashboard
        </div>
        <h1
          className="font-display font-black text-4xl md:text-5xl"
          style={{ letterSpacing: '-0.035em', lineHeight: 1.05 }}
        >
          Welcome back, <span style={{ fontStyle: 'italic', fontWeight: 400 }}>{user.name ?? user.email}</span>
        </h1>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="py-6 px-6 border border-[var(--border)]"
            style={{ background: 'var(--bg-elev)' }}
            data-testid="stat-card"
            data-label={c.label}
          >
            <div
              className="font-mono text-xs uppercase tracking-widest mb-2"
              style={{ color: 'var(--muted)' }}
            >
              {c.label}
            </div>
            <div
              className="font-display text-3xl mb-1"
              style={{ fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              {c.value.toLocaleString()}
            </div>
            <div className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
              {c.detail}
            </div>
            {c.href ? (
              <Link
                href={c.href}
                className="hover-link font-mono text-xs mt-3 inline-block"
              >
                view →
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// Avoid unused import warning on getSession (re-export for parity).
void getSession;

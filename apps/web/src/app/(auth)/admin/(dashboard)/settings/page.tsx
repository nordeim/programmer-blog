/**
 * apps/web/src/app/(auth)/admin/settings/page.tsx — FR-44.
 */
import { getSiteSettings } from '@devlog/db';
import { cookies } from 'next/headers';

import { SettingsForm } from '@/features/admin/settings-form';
import { SESSION_COOKIE, isAuthorRequiredError, requireAuthor } from '@/lib/auth';

export const metadata = {
  title: 'Settings — /dev/log admin',
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
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

  const settings = await getSiteSettings();

  return (
    <div data-testid="admin-settings">
      <header className="mb-12">
        <div
          className="font-mono text-xs uppercase tracking-widest mb-2"
          style={{ color: 'var(--accent)' }}
        >
          {'//'} admin / settings
        </div>
        <h1
          className="font-display font-black text-3xl md:text-4xl"
          style={{ letterSpacing: '-0.02em', lineHeight: 1.1 }}
        >
          Settings
        </h1>
      </header>
      <SettingsForm
        initial={{
          authorName: settings?.authorName ?? '',
          authorBio: settings?.authorBio ?? '',
          authorAvatarUrl: settings?.authorAvatarUrl ?? '',
          defaultSeoDescription: settings?.defaultSeoDescription ?? '',
          defaultOgImageUrl: settings?.defaultOgImageUrl ?? '',
          githubUrl: settings?.socialLinks?.github ?? '',
          twitterUrl: settings?.socialLinks?.twitter ?? '',
          rssUrl: settings?.socialLinks?.rss ?? '',
          emailUrl: settings?.socialLinks?.email ?? '',
        }}
      />
    </div>
  );
}

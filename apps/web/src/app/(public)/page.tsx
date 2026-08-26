/**
 * apps/web/src/app/(public)/page.tsx — landing page.
 *
 * Composes: <Hero>, <Marquee>, <RecentNotes>, <SnippetShowcase>,
 * <ArchivePreview>, <SubscribeSection>. Server component; each
 * child section fetches its own data (or uses mockup fallback).
 *
 * R-11 (audit remediation): renders a WebSite JSON-LD script per
 * PRD §5.3 SEO.
 *
 * Source: landing_page_mockup.html lines 583-1028.
 */
import { buildWebSiteSchema, JsonLd } from '@/components/json-ld';
import { ArchivePreview } from '@/features/landing/archive-preview';
import { Hero } from '@/features/landing/hero';
import { Marquee } from '@/features/landing/marquee';
import { RecentNotes } from '@/features/landing/recent-notes';
import { SnippetShowcase } from '@/features/landing/snippet-showcase';
import { SubscribeSection } from '@/features/landing/subscribe-section';
import { env } from '@/lib/env';

export default function LandingPage() {
  const webSiteSchema = buildWebSiteSchema({
    name: '/dev/log',
    url: env.NEXT_PUBLIC_SITE_URL,
    description: "Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am.",
  });

  return (
    <>
      <JsonLd data={webSiteSchema} />
      {/* Hidden marker for the smoke test (was on the Phase 1 placeholder). */}
      <span data-testid="logotype-marker" className="sr-only">
        /dev/log
      </span>
      <Hero />
      <Marquee />
      <RecentNotes />
      <SnippetShowcase />
      <ArchivePreview />
      <SubscribeSection />
    </>
  );
}

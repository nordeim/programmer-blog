/**
 * apps/web/src/app/(public)/page.tsx — landing page.
 *
 * Composes: <Hero>, <Marquee>, <RecentNotes>, <SnippetShowcase>,
 * <ArchivePreview>, <SubscribeSection>. Server component; each
 * child section fetches its own data (or uses mockup fallback).
 *
 * Source: landing_page_mockup.html lines 583-1028.
 */
import { ArchivePreview } from '@/features/landing/archive-preview';
import { Hero } from '@/features/landing/hero';
import { Marquee } from '@/features/landing/marquee';
import { RecentNotes } from '@/features/landing/recent-notes';
import { SnippetShowcase } from '@/features/landing/snippet-showcase';
import { SubscribeSection } from '@/features/landing/subscribe-section';

export default function LandingPage() {
  return (
    <>
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

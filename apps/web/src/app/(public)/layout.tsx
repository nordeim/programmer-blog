/**
 * apps/web/src/app/(public)/layout.tsx — public-facing layout.
 *
 * Wraps every public page in: <ProgressBar>, <Nav>, <main>{children}</main>,
 * <Footer>. The Toaster (sonner) is mounted here so client-side toasts
 * (subscribe success, copy confirmation) work across all public pages.
 */
import { Footer } from '@/features/landing/footer';
import { Nav } from '@/features/landing/nav';
import { ProgressBar } from '@/features/landing/progress-bar';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProgressBar />
      <Nav />
      <main id="main" className="pt-0">
        {children}
      </main>
      <Footer />
    </>
  );
}

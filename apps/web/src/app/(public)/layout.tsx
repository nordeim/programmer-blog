/**
 * apps/web/src/app/(public)/layout.tsx — public-facing layout.
 *
 * Wraps every public page in: <ProgressBar>, <Nav>, <main>{children}</main>,
 * <Footer>. R-93 (Pass 7, L-56): a previous docstring claimed a sonner
 * <Toaster> is mounted here — no Toaster exists; subscribe feedback uses
 * the landing page's own <SubscribeToast> component.
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

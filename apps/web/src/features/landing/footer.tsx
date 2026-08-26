/**
 * apps/web/src/features/landing/footer.tsx — FR-13.
 *
 * The site footer with copyright, 4 social links, and the
 * `$ echo "thanks for reading" | sudo tee /dev/stdout` tagline.
 *
 * Source: landing_page_mockup.html lines 1010-1028.
 */
import { HoverLink } from '@/components/hover-link';
import { env } from '@/lib/env';

export function Footer() {
  const authorEmail = env.NEXT_PUBLIC_AUTHOR_EMAIL;
  const repoUrl = `https://github.com/${env.NEXT_PUBLIC_GITHUB_REPO}`;
  const year = new Date().getFullYear();

  return (
    <footer className="py-12 px-6 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
          <div className="font-mono text-sm" style={{ color: 'var(--muted)' }}>
            © {year} Alex Rivera · built with care, not frameworks
          </div>
          <div className="flex items-center gap-5">
            <HoverLink
              href={repoUrl}
              className="text-lg"
              ariaLabel="GitHub"
            >
              <span aria-hidden="true">▣</span>{' '}
              <span className="sr-only">GitHub</span>
            </HoverLink>
            <HoverLink
              href="https://twitter.com"
              className="text-lg"
              ariaLabel="Twitter"
            >
              <span aria-hidden="true">✦</span>{' '}
              <span className="sr-only">Twitter</span>
            </HoverLink>
            <HoverLink href="/rss.xml" className="text-lg" ariaLabel="RSS">
              <span aria-hidden="true">≡</span>{' '}
              <span className="sr-only">RSS</span>
            </HoverLink>
            <HoverLink
              href={`mailto:${authorEmail}`}
              className="text-lg"
              ariaLabel="Email"
            >
              <span aria-hidden="true">✉</span>{' '}
              <span className="sr-only">Email</span>
            </HoverLink>
          </div>
        </div>
        <div
          className="text-center font-mono text-xs pt-8"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <span style={{ color: 'var(--accent)' }}>$</span> echo &quot;thanks for
          reading&quot; | sudo tee /dev/stdout
        </div>
      </div>
    </footer>
  );
}

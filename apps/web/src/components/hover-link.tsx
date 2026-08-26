/**
 * apps/web/src/components/hover-link.tsx — the `.hover-link` underline.
 *
 * Source: landing_page_mockup.html lines 538-546.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';

interface HoverLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function HoverLink({ href, children, className = '', ariaLabel }: HoverLinkProps) {
  const isInternal = href.startsWith('/') || href.startsWith('#');
  if (isInternal) {
    return (
      <Link
        href={href}
        className={`hover-link${className ? ` ${className}` : ''}`}
        aria-label={ariaLabel}
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      className={`hover-link${className ? ` ${className}` : ''}`}
      aria-label={ariaLabel}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

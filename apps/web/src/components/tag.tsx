/**
 * apps/web/src/components/tag.tsx — the `.tag` pill.
 *
 * Source: landing_page_mockup.html lines 337-345.
 */
import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  className?: string;
}

export function Tag({ children, className = '' }: TagProps) {
  return <span className={`tag${className ? ` ${className}` : ''}`}>{children}</span>;
}

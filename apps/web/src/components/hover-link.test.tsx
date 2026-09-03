/**
 * apps/web/src/components/hover-link.test.tsx — internal vs external link.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// next/link renders <a> in tests; mock to avoid the app-router context.
vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { HoverLink } from './hover-link';

describe('HoverLink', () => {
  it('renders internal paths with next/link (no target=_blank)', () => {
    const { getByRole } = render(<HoverLink href="/archive">archive</HoverLink>);
    const link = getByRole('link');
    expect(link).toHaveAttribute('href', '/archive');
    expect(link).not.toHaveAttribute('target');
    expect(link.className).toContain('hover-link');
  });

  it('renders hash links as internal', () => {
    const { getByRole } = render(<HoverLink href="#notes">notes</HoverLink>);
    expect(getByRole('link')).not.toHaveAttribute('target');
  });

  it('renders external links with target=_blank + rel hardening', () => {
    const { getByRole } = render(<HoverLink href="https://github.com/">github</HoverLink>);
    const link = getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('passes aria-label through', () => {
    const { getByRole } = render(
      <HoverLink href="/x" ariaLabel="go to x">
        x
      </HoverLink>,
    );
    expect(getByRole('link')).toHaveAttribute('aria-label', 'go to x');
  });
});

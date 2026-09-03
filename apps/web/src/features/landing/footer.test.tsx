/**
 * apps/web/src/features/landing/footer.test.tsx — FR-13.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_AUTHOR_EMAIL: 'hi@devlog.example',
    NEXT_PUBLIC_GITHUB_REPO: 'nordeim/programmer-blog',
  },
}));

import { Footer } from './footer';

describe('Footer', () => {
  it('renders the copyright line with the current year', () => {
    const { getByText } = render(<Footer />);
    expect(getByText(new RegExp(`${new Date().getFullYear()} Alex Rivera`))).toBeTruthy();
  });

  it('links to the GitHub repo', () => {
    const { getByRole } = render(<Footer />);
    expect(getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/nordeim/programmer-blog',
    );
  });

  it('links to the author email', () => {
    const { getByRole } = render(<Footer />);
    expect(getByRole('link', { name: /email/i })).toHaveAttribute('href', 'mailto:hi@devlog.example');
  });

  it('renders the echo tagline', () => {
    const { container } = render(<Footer />);
    expect(container.textContent).toContain('echo "thanks for reading"');
  });
});

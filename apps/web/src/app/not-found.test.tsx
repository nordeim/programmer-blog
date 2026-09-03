/**
 * apps/web/src/app/not-found.test.tsx — branded 404 page.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import NotFound from './not-found';

describe('NotFound (404 page)', () => {
  it('renders the branded 404 with the three nav links', () => {
    const { getByTestId, getByRole } = render(<NotFound />);
    expect(getByTestId('not-found')).toBeTruthy();
    expect(getByRole('link', { name: /back home/i })).toHaveAttribute('href', '/');
    expect(getByRole('link', { name: /browse the archive/i })).toHaveAttribute('href', '/archive');
    expect(getByRole('link', { name: /read the snippets/i })).toHaveAttribute('href', '/snippets');
  });

  it('renders the command-not-found headline', () => {
    const { getByTestId } = render(<NotFound />);
    // headline is split across nodes: 'command <span>not found</span>'
    expect(getByTestId('not-found').textContent).toContain('command not found');
  });
});

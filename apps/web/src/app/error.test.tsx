/**
 * apps/web/src/app/error.test.tsx — branded 500 boundary.
 */
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import GlobalError from './error';

describe('GlobalError (500 page)', () => {
  it('renders the branded 500 with reset button and home link', () => {
    const reset = vi.fn();
    const { getByTestId, getByRole } = render(
      <GlobalError error={new Error('boom')} reset={reset} />,
    );
    expect(getByTestId('error-page')).toBeTruthy();
    // headline is split across nodes: 'segmentation <em>fault</em>'
    expect(getByTestId('error-page').textContent).toContain('segmentation fault');
    expect(getByRole('button', { name: /try again/i })).toBeTruthy();
    expect(getByRole('link', { name: /back home/i })).toHaveAttribute('href', '/');
  });

  it('shows the digest when present', () => {
    const err = Object.assign(new Error('boom'), { digest: 'abc123' });
    const { getByText } = render(<GlobalError error={err} reset={() => {}} />);
    expect(getByText(/digest: abc123/)).toBeTruthy();
  });

  it('hides the digest line when absent', () => {
    const { queryByText } = render(<GlobalError error={new Error('x')} reset={() => {}} />);
    expect(queryByText(/digest:/)).toBeNull();
  });

  it('calls reset() when the try-again button is clicked', () => {
    const reset = vi.fn();
    const { getByRole } = render(<GlobalError error={new Error('x')} reset={reset} />);
    fireEvent.click(getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('logs the error via console.error in the effect', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('logged');
    render(<GlobalError error={err} reset={() => {}} />);
    expect(spy).toHaveBeenCalledWith('[error-boundary] unhandled error:', err);
    spy.mockRestore();
  });
});

/**
 * apps/web/src/features/landing/progress-bar.test.tsx — FR-1.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/use-scroll-progress', () => ({
  useScrollProgress: () => 42,
}));

import { ProgressBar } from './progress-bar';

describe('ProgressBar', () => {
  it('renders an accessible progressbar with the current value', () => {
    const { getByRole } = render(<ProgressBar />);
    const bar = getByRole('progressbar', { name: 'Reading progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar.style.width).toBe('42%');
  });
});

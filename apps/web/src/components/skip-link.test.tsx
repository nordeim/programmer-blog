/**
 * apps/web/src/components/skip-link.test.tsx — a11y skip link (PAD §6.3).
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SkipLink } from './skip-link';

describe('SkipLink', () => {
  it('renders an anchor targeting #main by default', () => {
    const { getByRole } = render(<SkipLink />);
    const link = getByRole('link');
    expect(link).toHaveAttribute('href', '#main');
    expect(link.textContent).toBe('skip to content');
  });

  it('accepts a custom target id', () => {
    const { getByRole } = render(<SkipLink targetId="content" />);
    expect(getByRole('link')).toHaveAttribute('href', '#content');
  });
});

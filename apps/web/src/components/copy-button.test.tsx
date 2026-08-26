/**
 * apps/web/src/components/copy-button.test.tsx — Phase 3 component test.
 *
 * Tests:
 *   1. Renders the .copy-btn class with default label.
 *   2. Click triggers navigator.clipboard.writeText with `target`.
 *   3. Label swaps to "copied" after click.
 *
 * Uses real timers because the hook uses async `navigator.clipboard.writeText`.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CopyButton } from './copy-button';

describe('<CopyButton>', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders .copy-btn class with default label', () => {
    const { container } = render(<CopyButton target="hello" />);
    const btn = container.querySelector('.copy-btn');
    expect(btn).not.toBeNull();
    expect(screen.getByText('copy')).toBeInTheDocument();
  });

  it('clicks write `target` to clipboard', async () => {
    const { container } = render(<CopyButton target="hello world" />);
    const btn = container.querySelector('.copy-btn') as HTMLButtonElement;
    btn.click();
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello world');
    });
  });

  it('swaps label to "copied" after click', async () => {
    const { container } = render(<CopyButton target="hello" />);
    const btn = container.querySelector('.copy-btn') as HTMLButtonElement;
    btn.click();
    await waitFor(() => {
      expect(screen.getByText('copied')).toBeInTheDocument();
    });
  });
});

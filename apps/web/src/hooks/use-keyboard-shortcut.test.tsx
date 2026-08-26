/**
 * apps/web/src/hooks/use-keyboard-shortcut.test.tsx — Phase 3 tests.
 *
 * Tests:
 *   1. Fires handler when the key is pressed (on document).
 *   2. Does NOT fire when an input/textarea is focused.
 *   3. Respects modifiers (Ctrl+K).
 */
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useKeyboardShortcut } from './use-keyboard-shortcut';

function TestComponent({
  shortKey,
  onFire,
  requireCtrl,
}: {
  shortKey: string;
  onFire: () => void;
  requireCtrl?: boolean;
}) {
  useKeyboardShortcut(shortKey, onFire, [shortKey], { requireCtrl });
  return (
    <div>
      <input data-testid="input" type="text" />
      <textarea data-testid="textarea" />
    </div>
  );
}

describe('useKeyboardShortcut', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires handler on keypress dispatched from document body', () => {
    const handler = vi.fn();
    render(<TestComponent shortKey="k" onFire={handler} />);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', bubbles: true }),
    );
    expect(handler).toHaveBeenCalled();
  });

  it('does not fire when an INPUT is the event target', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<TestComponent shortKey="k" onFire={handler} />);
    const input = getByTestId('input');
    // Dispatch from the input element directly so e.target is the input.
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', bubbles: true }),
    );
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire when a TEXTAREA is the event target', () => {
    const handler = vi.fn();
    const { getByTestId } = render(<TestComponent shortKey="k" onFire={handler} />);
    const ta = getByTestId('textarea');
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('requires Ctrl modifier when requireCtrl is true', () => {
    const handler = vi.fn();
    render(<TestComponent shortKey="k" onFire={handler} requireCtrl />);
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', bubbles: true }),
    );
    expect(handler).not.toHaveBeenCalled();
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
    );
    expect(handler).toHaveBeenCalled();
  });
});

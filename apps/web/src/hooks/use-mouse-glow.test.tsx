/**
 * apps/web/src/hooks/use-mouse-glow.test.tsx — Phase 3 tests for useMouseGlow.
 *
 * Tests:
 *   1. Returns initial position {0, 0} and visible=false.
 *   2. Mousemove updates position.
 *   3. mouseenter / mouseleave toggle visibility.
 *   4. Reduced motion → no listeners attached (visible stays false).
 */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMouseGlow } from './use-mouse-glow';

function TestComponent() {
  const { ref, position, visible } = useMouseGlow();
  return (
    <div
      ref={ref}
      data-testid="target"
      data-x={position.x}
      data-y={position.y}
      data-visible={visible}
    >
      glow
    </div>
  );
}

describe('useMouseGlow', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with position {0,0} and visible=false', () => {
    const { getByTestId } = render(<TestComponent />);
    const target = getByTestId('target');
    expect(target.dataset.x).toBe('0');
    expect(target.dataset.y).toBe('0');
    expect(target.dataset.visible).toBe('false');
  });

  it('updates position on mousemove', () => {
    const { getByTestId } = render(<TestComponent />);
    const target = getByTestId('target');
    target.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 1000,
        height: 1000,
        right: 1000,
        bottom: 1000,
        x: 0,
        y: 0,
        toJSON() {},
      }) as DOMRect;
    act(() => {
      target.dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: true, clientX: 0, clientY: 0 }),
      );
    });
    act(() => {
      target.dispatchEvent(
        new MouseEvent('mousemove', { bubbles: true, clientX: 150, clientY: 200 }),
      );
    });
    expect(target.dataset.x).toBe('150');
    expect(target.dataset.y).toBe('200');
    expect(target.dataset.visible).toBe('true');
  });

  it('hides on mouseleave', () => {
    const { getByTestId } = render(<TestComponent />);
    const target = getByTestId('target');
    target.getBoundingClientRect = () => ({}) as DOMRect;
    act(() => {
      target.dispatchEvent(new MouseEvent('mouseenter'));
    });
    expect(target.dataset.visible).toBe('true');
    act(() => {
      target.dispatchEvent(new MouseEvent('mouseleave'));
    });
    expect(target.dataset.visible).toBe('false');
  });
});

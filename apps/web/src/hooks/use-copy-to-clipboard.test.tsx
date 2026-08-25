/**
 * apps/web/src/hooks/use-copy-to-clipboard.test.tsx — Phase 3 tests.
 *
 * Tests FR-10: writes to clipboard, falls back to execCommand when
 * navigator.clipboard is unavailable, resets the `copied` flag after
 * 1800ms.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from './use-copy-to-clipboard';

describe('useCopyToClipboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns copied=false initially', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
  });

  it('uses navigator.clipboard.writeText when available and sets copied=true', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText, readText: vi.fn() },
    });
    const { result } = renderHook(() => useCopyToClipboard());
    let ok = false;
    act(() => {
      // Flush the async writeText promise.
      void result.current.copy('hello').then((r) => {
        ok = r;
      });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledWith('hello');
    expect(result.current.copied).toBe(true);
    expect(ok).toBe(true);
  });

  it('resets copied back to false after 1800ms', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText, readText: vi.fn() },
    });
    const { result } = renderHook(() => useCopyToClipboard());
    act(() => {
      void result.current.copy('hello');
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.copied).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1800);
    });
    expect(result.current.copied).toBe(false);
  });

  it('falls back to document.execCommand when navigator.clipboard is unavailable', async () => {
    // Remove clipboard.
    // @ts-expect-error — deleting a property from navigator.
    delete navigator.clipboard;
    const execSpy = vi.fn().mockReturnValue(true);
    // jsdom doesn't ship execCommand — patch it onto the document.
    (document as unknown as { execCommand: unknown }).execCommand = execSpy;
    const { result } = renderHook(() => useCopyToClipboard());
    let ok = false;
    await act(async () => {
      ok = await result.current.copy('hello-from-fallback');
    });
    expect(execSpy).toHaveBeenCalledWith('copy');
    expect(ok).toBe(true);
    expect(result.current.copied).toBe(true);
  });
});

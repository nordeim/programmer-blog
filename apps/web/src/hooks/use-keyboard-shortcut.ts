/**
 * apps/web/src/hooks/use-keyboard-shortcut.ts — FR-14.
 *
 * Generic keyboard-shortcut hook. Listens for `keydown` events with the
 * specified key (case-insensitive). Ignores when an INPUT, TEXTAREA, or
 * contenteditable element is focused (so the user can type the letter).
 * Optionally requires a modifier (Ctrl/Cmd/Shift/Alt).
 *
 * Source: reuse from use-theme.ts (mockup lines 1253-1262).
 */
'use client';

import { useEffect } from 'react';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  deps: unknown[] = [],
  options: {
    requireCtrl?: boolean;
    requireShift?: boolean;
    requireAlt?: boolean;
    requireMeta?: boolean;
  } = {},
): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      const pressedKey = e.key.toLowerCase();
      const expected = key.toLowerCase();
      if (pressedKey !== expected) return;
      if (options.requireCtrl && !e.ctrlKey) return;
      if (options.requireShift && !e.shiftKey) return;
      if (options.requireAlt && !e.altKey) return;
      if (options.requireMeta && !e.metaKey) return;
      e.preventDefault();
      handler();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);
}

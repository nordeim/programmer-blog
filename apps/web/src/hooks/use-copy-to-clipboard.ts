/**
 * apps/web/src/hooks/use-copy-to-clipboard.ts — FR-10.
 *
 * Writes text to the clipboard via navigator.clipboard.writeText. Falls
 * back to document.execCommand('copy') with a hidden <textarea> when the
 * async API is unavailable (HTTP context, older Safari). Returns a
 * `copied` flag that resets after 1800ms.
 *
 * Source of truth: landing_page_mockup.html lines 1106-1142.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const RESET_AFTER_MS = 1800;

export function useCopyToClipboard(): {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
} {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    // Modern path: navigator.clipboard.writeText (HTTPS only).
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === 'function'
    ) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), RESET_AFTER_MS);
        return true;
      } catch {
        // Fall through to legacy path.
      }
    }

    // Legacy fallback: hidden textarea + execCommand.
    try {
      if (typeof document === 'undefined') return false;
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        setCopied(true);
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), RESET_AFTER_MS);
      }
      return ok;
    } catch {
      return false;
    }
  }, []);

  return { copied, copy };
}

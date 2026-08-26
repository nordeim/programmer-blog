/**
 * apps/web/src/components/copy-button.tsx — FR-10.
 *
 * The `.copy-btn` pattern. Uses `useCopyToClipboard` to write `target`
 * to the clipboard. Visual feedback: a brief `.copy-flash` overlay and
 * label swap to "copied" for 1800ms.
 *
 * Source: landing_page_mockup.html lines 350-356, 1106-1142.
 */
'use client';

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

interface CopyButtonProps {
  target: string;
  label?: string;
  copiedLabel?: string;
  ariaLabel?: string;
}

export function CopyButton({
  target,
  label = 'copy',
  copiedLabel = 'copied',
  ariaLabel = 'Copy code to clipboard',
}: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button
      type="button"
      className={`copy-btn${copied ? ' is-copied' : ''}`}
      aria-label={ariaLabel}
      onClick={() => {
        void copy(target);
      }}
    >
      <span className="copy-flash" aria-hidden="true" />
      <span className="copy-icon" aria-hidden="true">
        {copied ? '✓' : '⧉'}
      </span>
      <span className="copy-label">{copied ? copiedLabel : label}</span>
    </button>
  );
}

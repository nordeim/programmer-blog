/**
 * apps/web/src/components/code-window.tsx — FR-9, FR-10.
 *
 * The `.code-window` pattern: a macOS-style code container with traffic-
 * light dots, a filename title, a CopyButton, and the highlighted code.
 * If `language` is provided we render `<pre><code className={`language-${language}`}>`.
 * Shiki is wired in Phase 5 (MDX rendering); for now we render plain
 * (escaped) text inside `<pre><code>` to keep the visual identical.
 *
 * Source: landing_page_mockup.html lines 360-405 (code-window structure).
 */
import type { ReactNode } from 'react';

import { CopyButton } from './copy-button';

interface CodeWindowProps {
  title: string;
  code: string;
  language?: string;
  /** Optional className for the wrapper. */
  className?: string;
  /** Optional override of the copy button's `target` (defaults to `code`). */
  copyTarget?: string;
  /** Render additional header content (e.g. copy button) — defaults to true. */
  showCopyButton?: boolean;
  /** Right-side children in the header (rarely needed). */
  headerExtra?: ReactNode;
}

export function CodeWindow({
  title,
  code,
  language,
  className = '',
  copyTarget,
  showCopyButton = true,
  headerExtra,
}: CodeWindowProps) {
  return (
    <div className={`code-window${className ? ` ${className}` : ''}`}>
      <div className="code-header">
        <div className="flex items-center gap-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                background: '#ff5f57',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                background: '#febc2e',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                width: '11px',
                height: '11px',
                borderRadius: '50%',
                background: '#28c840',
                display: 'inline-block',
              }}
            />
          </span>
          <span className="font-mono text-xs" style={{ color: 'var(--muted)' }}>
            {title}
          </span>
        </div>
        {showCopyButton ? (
          <>
            <CopyButton target={copyTarget ?? code} />
            {headerExtra}
          </>
        ) : (
          headerExtra
        )}
      </div>
      <pre
        className="p-6 md:p-7 text-xs md:text-sm overflow-x-auto"
        style={{ background: 'var(--code-bg)', margin: 0, lineHeight: 1.7 }}
      >
        <code className={language ? `language-${language}` : undefined}>{code}</code>
      </pre>
    </div>
  );
}

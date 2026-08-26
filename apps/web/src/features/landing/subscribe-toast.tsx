/**
 * apps/web/src/features/landing/subscribe-toast.tsx — FR-12.
 *
 * The #subToast element. Fades in (.opacity-0 → opacity-1) when visible.
 * Renders the success message; auto-hides after 8 seconds.
 *
 * Source: landing_page_mockup.html lines 989-991.
 */
'use client';

import { useEffect } from 'react';

import { useUiStore } from '@/stores/ui-store';

interface SubscribeToastProps {
  message: string;
  durationMs?: number;
}

export function SubscribeToast({
  message,
  durationMs = 8000,
}: SubscribeToastProps) {
  const visible = useUiStore((s) => s.subscribeToastVisible);
  const hide = useUiStore((s) => s.hideSubscribeToast);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => hide(), durationMs);
    return () => clearTimeout(t);
  }, [visible, durationMs, hide]);

  return (
    <div
      id="subToast"
      className="font-mono text-sm mt-6 text-center transition-opacity duration-500"
      style={{
        color: 'var(--accent)',
        opacity: visible ? 1 : 0,
      }}
      role="status"
      aria-live="polite"
    >
      ✓ {message}
    </div>
  );
}

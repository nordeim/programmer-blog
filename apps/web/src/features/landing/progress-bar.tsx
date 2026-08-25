/**
 * apps/web/src/features/landing/progress-bar.tsx — FR-1.
 *
 * The fixed reading progress bar. 3px tall, gradient background, glowing.
 * Width 0 → 100% based on scroll position.
 *
 * Source: landing_page_mockup.html lines 583, 1067-1076.
 */
'use client';

import { useScrollProgress } from '@/hooks/use-scroll-progress';

export function ProgressBar() {
  const progress = useScrollProgress();
  return (
    <div
      className="progress-bar"
      style={{ width: `${progress}%` }}
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    />
  );
}

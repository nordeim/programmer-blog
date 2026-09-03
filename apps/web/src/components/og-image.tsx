/**
 * apps/web/src/components/og-image.tsx — centralized OG image renderer (R-14).
 *
 * Renders a 1200×630 PNG via next/og's ImageResponse using the /dev/log
 * brand system (dark theme tokens from @devlog/config/tailwind/base.css).
 * Used by:
 *   - apps/web/src/app/opengraph-image.tsx (site card)
 *   - apps/web/src/app/(public)/posts/[slug]/opengraph-image.tsx (post card)
 *
 * Server-rendered — the JSX tree must only use inline styles (satori
 * restriction, no Tailwind classes / no CSS variables).
 */
import { ImageResponse } from 'next/og';

// Brand tokens — dark theme, mirrored from @devlog/config/tailwind/base.css.
const BRAND = {
  bg: '#0c0b09',
  bgElev: '#14120e',
  fg: '#f0ead6',
  fgDim: '#c9c1ad',
  muted: '#8a8275',
  accent: '#f59e0b',
  accent2: '#06b6d4',
} as const;

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

export interface OgImageProps {
  /** Main line — site name or post title. */
  title: string;
  /** Secondary line — tagline, or 'essay' / category for posts. */
  subtitle?: string;
  /** Optional reading time, shown as '~N min' for posts. */
  readingMinutes?: number;
}

export function renderOgImage({ title, subtitle, readingMinutes }: OgImageProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: BRAND.bg,
          padding: '72px 80px',
          fontFamily: 'monospace',
        }}
      >
        {/* Top brand row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 34,
              color: BRAND.fg,
              letterSpacing: 2,
            }}
          >
            <span style={{ color: BRAND.accent }}>{'/dev'}</span>
            <span style={{ color: BRAND.fgDim }}>{'/log'}</span>
          </div>
          {readingMinutes ? (
            <div style={{ display: 'flex', fontSize: 26, color: BRAND.muted }}>
              {`~${readingMinutes} min`}
            </div>
          ) : null}
        </div>

        {/* Title block */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {subtitle ? (
            <div
              style={{
                display: 'flex',
                fontSize: 28,
                color: BRAND.accent2,
                letterSpacing: 3,
                textTransform: 'uppercase',
                marginBottom: 18,
              }}
            >
              {subtitle}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              fontSize: title.length > 48 ? 56 : 72,
              fontWeight: 700,
              color: BRAND.fg,
              lineHeight: 1.15,
              maxWidth: 1040,
            }}
          >
            {title}
          </div>
        </div>

        {/* Footer rule */}
        <div
          style={{
            display: 'flex',
            height: 8,
            background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.accent2})`,
            borderRadius: 4,
          }}
        />
      </div>
    ),
    { ...OG_SIZE },
  );
}

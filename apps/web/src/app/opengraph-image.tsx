/**
 * apps/web/src/app/opengraph-image.tsx — site OG image (R-14).
 *
 * Next.js file convention: served at /opengraph-image. Used as the
 * fallback og:image for every route that doesn't define its own.
 */
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/components/og-image';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = '/dev/log — Notes from a Programmer';

export default function SiteOgImage() {
  return renderOgImage({
    title: '/dev/log',
    subtitle: 'Notes from a Programmer’s Desk',
  });
}

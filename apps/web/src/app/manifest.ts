/**
 * apps/web/src/app/manifest.ts — PWA web manifest (R-15).
 *
 * Next.js file convention: served at /manifest.webmanifest with the
 * correct Content-Type. Brand tokens mirror the dark theme in
 * @devlog/config/tailwind/base.css.
 */
import type { MetadataRoute } from 'next';

export const manifest: MetadataRoute.Manifest = {
  name: '/dev/log — Notes from a Programmer',
  short_name: '/dev/log',
  description:
    "Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am. By Alex Rivera.",
  start_url: '/',
  display: 'standalone',
  background_color: '#0c0b09',
  theme_color: '#0c0b09',
  icons: [
    {
      src: '/icon.svg',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'any',
    },
  ],
};

// Next.js file convention: the route entry imports the default export and
// CALLS it (`const data = await handler()`), so it must be a function.
export default function manifestRoute(): MetadataRoute.Manifest {
  return manifest;
}

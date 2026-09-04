/**
 * apps/web/src/app/api/robots.txt/route.ts — FR-24.
 *
 * GET /robots.txt — returns a basic robots.txt that allows all
 * crawlers and points them at the sitemap.
 *
 * Per https://www.rfc-editor.org/rfc/rfc9309 (Robots Exclusion Protocol).
 */
import 'server-only';

import { env } from '@/lib/env';

export const dynamic = 'force-static';
/**
 * R-52 (Pass 5, M-41): revalidate hourly like the feeds. The previous
 * 24h cadence served a build-machine URL (`Sitemap: http://localhost:3000/…`)
 * for up to a day after each deploy.
 */
export const revalidate = 3600;

export async function GET() {
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}

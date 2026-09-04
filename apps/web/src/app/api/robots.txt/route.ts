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
      // R-75 (Pass 7, M-49): hourly, matching the ISR cadence and the
      // rss/sitemap routes. The previous 24h s-maxage let a CDN pin a
      // stale pre-deploy copy for a day (a live Cloudflare edge HIT kept
      // serving a localhost sitemap URL at age 34507s) — defeating the
      // hourly self-heal this route's revalidate promises.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}

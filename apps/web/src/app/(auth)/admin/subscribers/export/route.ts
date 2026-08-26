/**
 * apps/web/src/app/(auth)/admin/subscribers/export/route.ts — FR-42.
 *
 * GET /admin/subscribers/export — streams a CSV of all subscribers.
 * Content-Type: text/csv; charset=utf-8.
 * Content-Disposition: attachment; filename=subscribers-YYYY-MM-DD.csv.
 *
 * Per PAD §3.3 Pattern 4.
 */
import 'server-only';
import { cookies } from 'next/headers';

import { isAuthorRequiredError, requireAuthor } from '@/lib/auth';
import { db, schema } from '@/lib/db';

// Force dynamic rendering — this route reads cookies and must run on
// every request, never at build time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function csvEscape(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const jar = await cookies();
  try {
    await requireAuthor(jar.get('devlog_session')?.value);
  } catch (e) {
    if (isAuthorRequiredError(e)) {
      return new Response('Unauthorized', { status: 302, headers: { Location: '/admin/login' } });
    }
    throw e;
  }

  const rows = db.select().from(schema.subscribers).all();
  const date = new Date().toISOString().split('T')[0];
  const header = ['email', 'status', 'joined_at', 'confirmed_at', 'unsubscribed_at', 'frequency'];
  const body = rows.map((r) =>
    [
      r.email,
      r.status,
      r.createdAt?.toISOString() ?? '',
      r.confirmedAt?.toISOString() ?? '',
      r.unsubscribedAt?.toISOString() ?? '',
      r.preferences?.frequency ?? '',
    ]
      .map((v) => csvEscape(typeof v === 'string' ? v : ''))
      .join(','),
  );
  const csv = [header.join(','), ...body].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=subscribers-${date}.csv`,
      'Cache-Control': 'no-store',
    },
  });
}

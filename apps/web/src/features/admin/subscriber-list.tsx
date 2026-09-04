/**
 * apps/web/src/features/admin/subscriber-list.tsx — FR-42.
 *
 * Client component. Table of subscribers with status filter + search.
 * CSV export is handled server-side at /admin/subscribers/export.
 */
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { formatArchiveDate } from '@/lib/blog';

interface AdminSubscriber {
  id: string;
  email: string;
  status: 'pending' | 'confirmed' | 'unsubscribed' | 'bounced';
  createdAt: Date;
  confirmedAt: Date | null;
  preferences: { frequency: 'weekly' | 'monthly' } | null;
}

interface SubscriberListProps {
  subscribers: AdminSubscriber[];
}

type StatusFilter = 'all' | AdminSubscriber['status'];

const STATUSES: StatusFilter[] = ['all', 'pending', 'confirmed', 'unsubscribed', 'bounced'];

export function SubscriberList({ subscribers }: SubscriberListProps) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subscribers.filter((s) => {
      if (filter !== 'all' && s.status !== filter) return false;
      if (q && !s.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [subscribers, filter, query]);

  return (
    <div data-testid="subscriber-list">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="sl-status" className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            status
          </label>
          <select
            id="sl-status"
            value={filter}
            onChange={(e) => setFilter(e.target.value as StatusFilter)}
            className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2 font-mono text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-50">
          <label htmlFor="sl-search" className="font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            search
          </label>
          <input
            id="sl-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="email…"
            className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2 font-mono text-sm"
          />
        </div>
        <Link href="/admin/subscribers/export" className="btn-secondary">
          export csv ↓
        </Link>
      </div>

      <table className="w-full text-sm" data-testid="subscriber-table">
        <thead>
          <tr className="border-b border-[var(--border)] font-mono text-xs uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            <th className="text-left py-2">Email</th>
            <th className="text-left py-2">Status</th>
            <th className="text-left py-2 hidden md:table-cell">Joined</th>
            <th className="text-left py-2 hidden md:table-cell">Confirmed</th>
            <th className="text-left py-2 hidden md:table-cell">Frequency</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-12 text-center font-mono text-sm" style={{ color: 'var(--muted)' }}>
                no subscribers match this filter.
              </td>
            </tr>
          ) : (
            filtered.map((s) => (
              <tr key={s.id} className="border-b border-[var(--border)]">
                <td className="py-3 pr-3 font-mono text-sm">{s.email}</td>
                <td className="py-3 pr-3">
                  <span
                    className="font-mono text-xs uppercase"
                    style={{
                      color:
                        s.status === 'confirmed'
                          ? 'var(--accent-2)'
                          : s.status === 'unsubscribed' || s.status === 'bounced'
                            ? 'var(--muted)'
                            : 'var(--accent)',
                    }}
                  >
                    {s.status}
                  </span>
                </td>
                <td className="py-3 pr-3 hidden md:table-cell font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  {formatArchiveDate(s.createdAt)}
                </td>
                <td className="py-3 pr-3 hidden md:table-cell font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  {s.confirmedAt ? formatArchiveDate(s.confirmedAt) : '—'}
                </td>
                <td className="py-3 pr-3 hidden md:table-cell font-mono text-xs" style={{ color: 'var(--muted)' }}>
                  {s.preferences?.frequency ?? '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div className="mt-4 font-mono text-xs" style={{ color: 'var(--muted)' }}>
        showing {filtered.length} of {subscribers.length} subscribers
      </div>
    </div>
  );
}

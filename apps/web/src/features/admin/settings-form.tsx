/**
 * apps/web/src/features/admin/settings-form.tsx — FR-44.
 *
 * Client component. Renders the site settings form. Calls the
 * `updateSiteSettings` Server Action. On success, calls router.refresh()
 * so the new settings are reflected site-wide.
 */
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { updateSiteSettings } from '@/features/admin/actions';

interface SettingsFormProps {
  initial: {
    authorName: string;
    authorBio: string;
    authorAvatarUrl?: string | null;
    defaultSeoDescription: string;
    defaultOgImageUrl?: string | null;
    githubUrl?: string | null;
    twitterUrl?: string | null;
    rssUrl?: string | null;
    emailUrl?: string | null;
  };
}

export function SettingsForm({ initial }: SettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function set<K extends keyof SettingsFormProps['initial']>(
    key: K,
    value: SettingsFormProps['initial'][K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const r = await updateSiteSettings({
        authorName: form.authorName,
        authorBio: form.authorBio,
        authorAvatarUrl: form.authorAvatarUrl ?? '',
        defaultSeoDescription: form.defaultSeoDescription,
        defaultOgImageUrl: form.defaultOgImageUrl ?? '',
        githubUrl: form.githubUrl ?? '',
        twitterUrl: form.twitterUrl ?? '',
        rssUrl: form.rssUrl ?? '',
        emailUrl: form.emailUrl ?? '',
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess(true);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-6 max-w-2xl"
      data-testid="settings-form"
    >
      <Field label="Author name" id="sf-authorName">
        <input
          id="sf-authorName"
          value={form.authorName}
          onChange={(e) => set('authorName', e.target.value)}
          required
          maxLength={100}
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
          disabled={submitting}
        />
      </Field>

      <Field label="Author bio" id="sf-authorBio">
        <textarea
          id="sf-authorBio"
          value={form.authorBio}
          onChange={(e) => set('authorBio', e.target.value)}
          rows={3}
          required
          maxLength={500}
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
          disabled={submitting}
        />
      </Field>

      <Field label="Author avatar URL (optional)" id="sf-authorAvatarUrl">
        <input
          id="sf-authorAvatarUrl"
          type="url"
          value={form.authorAvatarUrl ?? ''}
          onChange={(e) => set('authorAvatarUrl', e.target.value)}
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
          disabled={submitting}
        />
      </Field>

      <Field label="Default SEO description" id="sf-defaultSeoDescription">
        <textarea
          id="sf-defaultSeoDescription"
          value={form.defaultSeoDescription}
          onChange={(e) => set('defaultSeoDescription', e.target.value)}
          rows={2}
          required
          maxLength={300}
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
          disabled={submitting}
        />
      </Field>

      <Field label="Default OG image URL (optional)" id="sf-defaultOgImageUrl">
        <input
          id="sf-defaultOgImageUrl"
          type="url"
          value={form.defaultOgImageUrl ?? ''}
          onChange={(e) => set('defaultOgImageUrl', e.target.value)}
          className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
          disabled={submitting}
        />
      </Field>

      <fieldset className="border border-[var(--border)] p-4">
        <legend className="font-mono text-xs uppercase tracking-widest px-2" style={{ color: 'var(--muted)' }}>
          social links
        </legend>
        <div className="flex flex-col gap-3 mt-3">
          <Field label="GitHub" id="sf-github" inline>
            <input
              id="sf-github"
              type="url"
              value={form.githubUrl ?? ''}
              onChange={(e) => set('githubUrl', e.target.value)}
              className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
              disabled={submitting}
            />
          </Field>
          <Field label="Twitter" id="sf-twitter" inline>
            <input
              id="sf-twitter"
              type="url"
              value={form.twitterUrl ?? ''}
              onChange={(e) => set('twitterUrl', e.target.value)}
              className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
              disabled={submitting}
            />
          </Field>
          <Field label="RSS" id="sf-rss" inline>
            <input
              id="sf-rss"
              type="url"
              value={form.rssUrl ?? ''}
              onChange={(e) => set('rssUrl', e.target.value)}
              className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
              disabled={submitting}
            />
          </Field>
          <Field label="Email (mailto:)" id="sf-email" inline>
            <input
              id="sf-email"
              type="email"
              value={form.emailUrl ?? ''}
              onChange={(e) => set('emailUrl', e.target.value)}
              className="bg-[var(--bg-elev)] border border-[var(--border)] px-3 py-2"
              disabled={submitting}
            />
          </Field>
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="font-mono text-sm" style={{ color: 'var(--accent)' }} data-testid="settings-error">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="font-mono text-sm" style={{ color: 'var(--accent-2)' }} data-testid="settings-success">
          saved.
        </p>
      ) : null}

      <button type="submit" className="btn-secondary self-start" disabled={submitting}>
        {submitting ? 'saving…' : 'save settings'}
      </button>
    </form>
  );
}

function Field({
  label,
  id,
  inline = false,
  children,
}: {
  label: string;
  id: string;
  inline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex ${inline ? 'flex-row items-center gap-3' : 'flex-col gap-1'}`}>
      <label
        htmlFor={id}
        className={`font-mono text-xs uppercase tracking-widest ${inline ? 'w-24 flex-shrink-0' : ''}`}
        style={{ color: 'var(--muted)' }}
      >
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

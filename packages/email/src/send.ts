/**
 * @devlog/email — Resend wrapper + React Email template registry.
 *
 * `sendEmail(template, props)`:
 *   1. Looks up the template component by name.
 *   2. Renders it to HTML + plain-text via @react-email/render.
 *   3. Calls `resend.emails.send({...})`.
 *   4. Catches Resend 4xx/5xx and returns a structured result.
 *
 * In dev (no RESEND_API_KEY), returns `{ ok: false, skipped: true }`.
 *
 * Per PAD §3.3 Pattern 6.
 */
import 'server-only';
import * as React from 'react';
import { Resend } from 'resend';

import { ConfirmEmail } from './templates/confirm-email';
import { NewEssayEmail } from './templates/new-essay-email';
import { UnsubscribeConfirmation } from './templates/unsubscribe-confirmation';

export type EmailTemplate =
  | 'confirm-email'
  | 'new-essay-email'
  | 'unsubscribe-confirmation';

export interface SendEmailArgs<T extends EmailTemplate = EmailTemplate> {
  to: string | string[];
  from?: string;
  subject: string;
  template: T;
  // The props for the chosen template. We use a union mapped to
  // the template component's props for type-safety at the call site.
  props: TemplateProps<T>;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

// Template registry. Each template is a React Email component.
export const TEMPLATES = {
  'confirm-email': ConfirmEmail,
  'new-essay-email': NewEssayEmail,
  'unsubscribe-confirmation': UnsubscribeConfirmation,
} as const;

export type TemplateProps<T extends EmailTemplate> = React.ComponentProps<
  (typeof TEMPLATES)[T]
>;

/**
 * Render a template to HTML + plain-text. Server-only.
 *
 * Uses dynamic import for @react-email/render so the package can
 * be loaded even when the templates themselves are React Email
 * components (which require React server-side rendering).
 */
export async function renderEmail<T extends EmailTemplate>(
  template: T,
  props: TemplateProps<T>,
): Promise<{ html: string; text: string }> {
  const { render } = await import('@react-email/render');
  // Cast to a generic FC so createElement is happy with the union of props.
  const Component = TEMPLATES[template] as unknown as React.FC<Record<string, unknown>>;
  const element = React.createElement(
    Component,
    props as unknown as Record<string, unknown>,
  );
  const html = await render(element as never);
  const text = await render(element as never, { plainText: true });
  return { html, text };
}

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.startsWith('re_test_')) {
    // Sandbox / test key — real Resend calls would still go through.
    // We allow this and surface the test-mode behaviour to the caller.
    return new Resend('re_test_dev_only');
  }
  return new Resend(apiKey);
}

export async function sendEmail<T extends EmailTemplate>(
  args: SendEmailArgs<T>,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      skipped: true,
      error: 'RESEND_API_KEY not configured. Email not sent.',
    };
  }
  try {
    const { html, text } = await renderEmail(args.template, args.props);
    const client = getResend();
    if (!client) {
      return { ok: false, skipped: true, error: 'Resend client unavailable.' };
    }
    const from = args.from ?? process.env.RESEND_FROM ?? 'onboarding@resend.dev';
    const { data, error } = await client.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html,
      text,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, messageId: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

/**
 * @devlog/email — Phase 6 implementation.
 *
 * Resend wrapper + React Email template registry. The `sendEmail`
 * function takes a template name + props, renders the template to
 * HTML + plain-text, and dispatches via the Resend SDK.
 *
 * Without a configured RESEND_API_KEY (or with a sandbox `re_test_…`
 * key, R-88), `sendEmail` short-circuits and returns
 * `{ ok: false, skipped: true }` — the caller logs the skip; subscribe
 * still succeeds (PRD §5.5: degrade gracefully).
 *
 * Per PAD §3.3 Pattern 6.
 */
export { sendEmail, renderEmail, type EmailTemplate, type SendEmailArgs, type SendEmailResult } from './send';

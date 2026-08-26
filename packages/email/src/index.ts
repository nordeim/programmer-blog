/**
 * @devlog/email — Phase 6 implementation.
 *
 * Resend wrapper + React Email template registry. The `sendEmail`
 * function takes a template name + props, renders the template to
 * HTML + plain-text, and dispatches via the Resend SDK.
 *
 * In dev (no API key configured), `sendEmail` short-circuits and
 * returns a stub success — the admin dashboard surfaces this so
 * the developer knows emails aren't being delivered.
 *
 * Per PAD §3.3 Pattern 6.
 */
export { sendEmail, renderEmail, type EmailTemplate, type SendEmailArgs, type SendEmailResult } from './send';

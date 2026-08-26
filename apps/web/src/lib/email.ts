/**
 * apps/web/src/lib/email.ts — thin re-export of @devlog/email.
 *
 * Feature code imports `sendEmail`, `renderEmail` from `@/lib/email`
 * rather than `@devlog/email` directly, keeping the import surface
 * consistent with PAD §3.2.
 */
export {
  renderEmail,
  sendEmail,
  type EmailTemplate,
  type SendEmailArgs,
  type SendEmailResult,
} from '@devlog/email';

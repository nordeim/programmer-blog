/**
 * apps/web/src/lib/log.ts — safe logging helpers (R-19 audit remediation).
 *
 * Wraps console.error with email masking per PRD §5.4 Logging:
 * "Never log secrets, email bodies, full emails (mask to a***@example.com)".
 *
 * Server-only.
 */
import 'server-only';

/**
 * Mask an email address for safe logging.
 *
 * - 'alex@devlog.example' → 'a***@devlog.example'
 * - 'a@b.co'              → 'a***@b.co'
 * - null/undefined/''    → '(no email)'
 * - non-string             → '(invalid email)'
 */
export function maskEmail(email: unknown): string {
  if (typeof email !== 'string' || email.length === 0) {
    return '(no email)';
  }
  const atIdx = email.indexOf('@');
  if (atIdx <= 0 || atIdx === email.length - 1) {
    return '(invalid email)';
  }
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  const maskedLocal = local.length <= 1 ? local + '***' : local[0] + '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Structured error log. Pass a scope tag, the error, and any extra
 * context (already-masked by the caller). Avoids logging full request
 * bodies, session tokens, or unmasked emails.
 */
export function logError(scope: string, err: unknown, extra?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${scope}]`, message, extra ?? {});
}

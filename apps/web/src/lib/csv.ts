/**
 * apps/web/src/lib/csv.ts — CSV cell escaping with formula-injection
 * guard (R-45, audit M-38).
 *
 * Spreadsheet applications (Excel, Numbers, Sheets) execute a cell whose
 * value begins with `=`, `+`, `-` or `@` as a formula. Any cell sourced
 * from user input (subscriber emails, free-form preferences) must be
 * neutralized with a leading apostrophe — the standard defense — in
 * addition to the usual quoting rules.
 */
export function csvEscape(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  const formulaGuard = /^[=+\-@]/.test(s) ? "'" : '';
  if (/[",\n\r]/.test(s)) {
    return `"${formulaGuard}${s.replace(/"/g, '""')}"`;
  }
  return `${formulaGuard}${s}`;
}

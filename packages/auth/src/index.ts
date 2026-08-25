/**
 * @devlog/auth — placeholder. The full Better Auth instance, client, and
 * RBAC helpers are added in Phase 2 of the Master_Execution_Plan.md.
 *
 * Exporting a placeholder keeps the package importable so that
 * `apps/web/src/lib/auth.ts` can re-export `auth` without breaking.
 */
export const authPlaceholder = Symbol('auth-not-yet-implemented');

export type AuthPlaceholder = typeof authPlaceholder;

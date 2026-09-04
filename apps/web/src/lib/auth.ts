/**
 * apps/web/src/lib/auth.ts — thin re-export of @devlog/auth.
 *
 * Feature code imports from `@/lib/auth` rather than `@devlog/auth`
 * directly, keeping the import surface consistent with PAD §3.2.
 */
export {
  SESSION_COOKIE,
  AuthorRequiredError,
  createSessionToken,
  createTransactionToken,
  getSession,
  getSessionFromCookies,
  isAuthorRequiredError,
  requireAuthor,
  signIn,
  signOut,
  signToken,
  verifySessionToken,
  verifyToken,
  verifyTransactionToken,
  SESSION_TTL,
  type SessionUser,
} from '@devlog/auth';

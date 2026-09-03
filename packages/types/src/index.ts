/**
 * @devlog/types — shared Zod schemas + TypeScript types + helpers.
 *
 * Populated during audit remediation R-18 (MEP Phase 2 file #17-23):
 *  - post.ts      PostInput schema, slugify, markdown-aware reading time
 *  - subscriber.ts Subscriber schemas + status enum
 *  - comment.ts   Comment input schema + status enum
 *  - user.ts      User roles + SessionUser schema
 *  - env.ts       Env schema shape + pure parseEnv helper
 *
 * Keep this package dependency-light: only `zod`. No server-only, no
 * node builtins — both the edge middleware and the web app import it.
 */
export {
  MAX_CONTENT,
  MAX_EXCERPT,
  MAX_TITLE,
  SLUG_RE,
  calculateReadTime,
  postInputSchema,
  postStatusSchema,
  slugify,
  stripMarkdown,
} from './post';
export type { PostInput, PostStatus } from './post';

export {
  subscribeInputSchema,
  subscriberPreferencesSchema,
  subscriberStatusSchema,
} from './subscriber';
export type {
  SubscribeInput,
  SubscriberPreferences,
  SubscriberStatus,
} from './subscriber';

export {
  MAX_AUTHOR_NAME,
  MAX_BODY_LENGTH,
  MIN_BODY_LENGTH,
  commentStatusSchema,
  createCommentInputSchema,
} from './comment';
export type { CommentStatus, CreateCommentInput } from './comment';

export { USER_ROLES, sessionUserSchema, userRoleSchema } from './user';
export type { SessionUser, UserRole } from './user';

export { envSchema, parseEnv } from './env';
export type { Env } from './env';

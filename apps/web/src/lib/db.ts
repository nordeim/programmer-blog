/**
 * apps/web/src/lib/db.ts — thin re-export of @devlog/db's singleton client.
 * Feature code imports `db` from `@/lib/db` rather than `@devlog/db` directly,
 * keeping the import surface consistent with PAD §3.2.
 */
import 'server-only';

export { db, schema } from '@devlog/db';
export type {
  Post,
  Subscriber,
  User,
  Session,
  Tag,
  Comment,
  SiteSettings,
} from '@devlog/db';

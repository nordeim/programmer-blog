/**
 * @devlog/db — singleton SQLite client (PAD §3.3 Pattern 2).
 *
 * In dev, Next.js hot-reloads modules. Without the globalThis guard,
 * every reload creates a new better-sqlite3 instance, eventually
 * exhausting file handles. The globalThis cache survives the reload.
 *
 * WAL mode enables concurrent readers + one writer (perfect for a blog).
 * Foreign keys are off by default in SQLite — turning them on is mandatory
 * for cascade deletes to work.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

declare global {
   
  var __devlog_db:
    | ReturnType<typeof createDrizzleClient>
    | undefined;
}

function createDrizzleClient() {
  const dbPath = process.env.DATABASE_PATH ?? './apps/web/devlog.db';
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export const db = globalThis.__devlog_db ?? createDrizzleClient();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__devlog_db = db;
}

export { schema };
export * from './schema';

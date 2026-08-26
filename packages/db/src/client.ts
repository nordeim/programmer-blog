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
 *
 * The client is lazy: the better-sqlite3 instance is created on first
 * access (via the `db` proxy) rather than at module load. This lets the
 * build evaluate the module for type info without actually opening a
 * database file — important when the configured DATABASE_PATH doesn't
 * exist at build time.
 */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

type DrizzleClient = BetterSQLite3Database<typeof schema>;

declare global {
  // R-20 (audit remediation): removed the stale `eslint-disable-next-line no-var`
  // directive — the rule no longer fires on this line, so the disable was unused.
  var __devlog_db:
    | DrizzleClient
    | undefined;
}

function resolveDbPath(): string {
  // 1. Explicit env var.
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  // 2. Default: devlog.db in the current working dir (Next.js runs
  //    from apps/web/ in dev, so this lands at apps/web/devlog.db).
  return './devlog.db';
}

function createDrizzleClient(): DrizzleClient {
  const dbPath = resolveDbPath();
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

/**
 * Lazy proxy: the underlying drizzle client is created on first property
 * access. This means importing `db` no longer opens a SQLite file — the
 * file is opened only when a query is actually run.
 *
 * Useful for: Next.js build (which evaluates route modules for type
 * collection without a DB), tests that mock @devlog/db entirely, and
 * migration scripts that want to defer DB opening until arguments are
 * parsed.
 */
export const db: DrizzleClient = new Proxy(
  {},
  {
    get(_target, prop) {
      const cached = globalThis.__devlog_db ?? createDrizzleClient();
      globalThis.__devlog_db = cached;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (cached as unknown as Record<string | symbol, any>)[prop];
      return typeof value === 'function' ? value.bind(cached) : value;
    },
  },
) as DrizzleClient;

export { schema };
export * from './schema';

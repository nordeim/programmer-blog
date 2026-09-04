/**
 * packages/db/src/migrate.ts — apply Drizzle migrations to the SQLite DB.
 *
 * Uses drizzle-orm/better-sqlite3/migrator. The function is re-exported
 * from packages/db/src/index.ts so callers can `import { runMigrations } from '@devlog/db'`.
 *
 * Run via: pnpm db:migrate (executes apps/web/src/scripts/migrate.ts with tsx).
 *
 * The migrations folder is resolved lazily inside `runMigrations()`
 * rather than at module load — that way importing this module at build
 * time (which happens transitively when route handlers import @devlog/db)
 * doesn't fail on environments where `import.meta.url` is unavailable
 * or where the migrations folder doesn't yet exist.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { openDatabaseForMigrations } from './client';

export function runMigrations(): void {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const migrationsFolder = path.resolve(here, '../migrations');
  console.log('[migrate] Applying migrations from', migrationsFolder);
  try {
    // R-38: migrations are the one flow allowed to CREATE a fresh database
    // file (bootstrap on a new deployment). The runtime client (db proxy)
    // still fails fast against a missing file.
    const migrationsDb = openDatabaseForMigrations();
    migrate(migrationsDb, { migrationsFolder });
    console.log('[migrate] Done.');
  } catch (err) {
    console.error('[migrate] Failed:', err);
    throw err;
  }
}

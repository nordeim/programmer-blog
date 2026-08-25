/**
 * packages/db/src/migrate.ts — apply Drizzle migrations to the SQLite DB.
 *
 * Uses drizzle-orm/better-sqlite3/migrator. The function is re-exported
 * from packages/db/src/index.ts so callers can `import { runMigrations } from '@devlog/db'`.
 *
 * Run via: pnpm db:migrate (executes apps/web/src/scripts/migrate.ts with tsx).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';

const here = fileURLToPath(new URL('.', import.meta.url));
const migrationsFolder = path.resolve(here, '../migrations');

export function runMigrations(): void {
  console.log('[migrate] Applying migrations from', migrationsFolder);
  try {
    migrate(db, { migrationsFolder });
    console.log('[migrate] Done.');
  } catch (err) {
    console.error('[migrate] Failed:', err);
    throw err;
  }
}

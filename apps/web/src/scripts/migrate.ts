/**
 * apps/web/src/scripts/migrate.ts — runs the @devlog/db runMigrations() function.
 * Invoked by `pnpm db:migrate` from repo root (Turborepo runs this via tsx).
 *
 * runMigrations() is synchronous (better-sqlite3 is sync) but may throw,
 * so we wrap the call in a try/catch and exit non-zero on failure.
 */
import { runMigrations } from '@devlog/db/migrate';

try {
  runMigrations();
} catch (err) {
  console.error('[db:migrate] Failed:', err);
  process.exit(1);
}

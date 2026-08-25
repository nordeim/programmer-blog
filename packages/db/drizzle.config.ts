import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit config — drives `pnpm db:generate` and `pnpm db:studio`.
 * The migrations are SQL files under packages/db/migrations/. Applied to
 * the SQLite database file via `pnpm db:migrate` (run from apps/web).
 */
export default {
  dialect: 'sqlite',
  schema: './src/schema.ts',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? './apps/web/devlog.db',
  },
  verbose: true,
  strict: true,
} satisfies Config;

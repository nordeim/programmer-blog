/**
 * apps/web/src/scripts/seed.ts — invokes the @devlog/db runSeed() function.
 * Run via: pnpm db:seed (from repo root).
 */
import { runSeed } from '@devlog/db';

runSeed().catch((err: unknown) => {
  console.error('[db:seed] Failed:', err);
  process.exit(1);
});

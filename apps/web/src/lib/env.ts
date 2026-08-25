/**
 * apps/web/src/lib/env.ts — Zod-validated env vars.
 * Throws at boot if any required var is missing.
 *
 * Re-exports the env schema from @devlog/types/env (added in Phase 2).
 * For Phase 1, we inline a minimal version so the app boots without
 * the @devlog/types package being populated.
 */
import 'server-only';
import { z } from 'zod';

const EnvSchema = z.object({
  // Database
  DATABASE_PATH: z.string().default('./devlog.db'),

  // Better Auth
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),

  // Resend
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  RESEND_FROM: z.string().email().default('onboarding@resend.dev'),

  // Signed tokens
  SIGNED_TOKEN_SECRET: z.string().min(32).optional(),

  // Public
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_GITHUB_REPO: z.string().default('tailwindlabs/tailwindcss'),
  NEXT_PUBLIC_AUTHOR_EMAIL: z.string().email().default('hi@devlog.example'),

  // GitHub fallback
  GITHUB_STATS_FALLBACK_STARS: z.coerce.number().int().default(82400),
  GITHUB_STATS_FALLBACK_FORKS: z.coerce.number().int().default(4180),

  // Cron
  CRON_SECRET: z.string().optional(),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // In dev, print the missing keys. In prod, fail fast.
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid environment variables:\n${issues}`);
    }
     
    console.warn(`[env] Invalid environment variables:\n${issues}`);
    return EnvSchema.parse({ ...process.env, ...EnvSchema._def.shape });
  }
  return parsed.data;
}

export const env = loadEnv();

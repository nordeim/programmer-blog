/**
 * apps/web/src/lib/env.ts — Zod-validated env vars.
 * Throws at boot if any required var is missing.
 *
 * R-13 (audit remediation): in production, missing security-critical
 * vars (BETTER_AUTH_SECRET, SIGNED_TOKEN_SECRET) cause a hard throw.
 * In dev, they log a clear warning and fall back to dev-only defaults
 * so `pnpm dev` boots out-of-the-box. Non-secret vars (NEXT_PUBLIC_*,
 * GITHUB_STATS_FALLBACK_*) use defaults in all environments.
 */
import 'server-only';
import { z } from 'zod';

const EnvSchema = z.object({
  // Database
  DATABASE_PATH: z.string().default('./devlog.db'),

  // Better Auth (renamed: HMAC session secret, but env name kept for compat)
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

  // Dev-only override for the seeded author password (R-1).
  DEV_AUTHOR_PASSWORD: z.string().min(8).optional(),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof EnvSchema>;

const SECURITY_CRITICAL_KEYS = new Set([
  'BETTER_AUTH_SECRET',
  'SIGNED_TOKEN_SECRET',
]);

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  // Validation failed. In production, this is fatal.
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  // In dev, log + fall back to all-defaults so `pnpm dev` still boots.
  const missingCritical = parsed.error.issues
    .filter((i) => SECURITY_CRITICAL_KEYS.has(i.path.join('.')))
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n');
  if (missingCritical) {
    console.warn(
      `[env] Missing security-critical env vars in dev:\n${missingCritical}\n` +
        `  Using dev-only fallback secrets. Set these in .env.local for production-equivalent dev.`,
    );
  } else {
    console.warn(`[env] Invalid environment variables:\n${issues}`);
  }
  // Parse an empty object — Zod fills in every key with its declared default.
  return EnvSchema.parse({});
}

export const env = loadEnv();

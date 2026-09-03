/**
 * packages/types/src/env.ts — shared env schema (R-18, MEP #21).
 *
 * Exports the Zod schema shape for the /dev/log environment plus a pure
 * `parseEnv` helper (no process.env access at import time — the app's
 * `apps/web/src/lib/env.ts` owns boot-time loading and secret policy).
 */
import { z } from 'zod';

export const envSchema = z.object({
  // Database
  DATABASE_PATH: z.string().default('./devlog.db'),

  // Session secret (HMAC key; env name kept for compat with the original
  // Better Auth plan — see PAD ADR-004 amendment).
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),

  // Resend
  RESEND_API_KEY: z.string().startsWith('re_').optional(),
  RESEND_FROM: z.string().email().default('onboarding@resend.dev'),

  // Signed transaction tokens (confirm / unsubscribe / preferences)
  SIGNED_TOKEN_SECRET: z.string().min(32).optional(),

  // Public
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_GITHUB_REPO: z.string().default('tailwindlabs/tailwindcss'),
  NEXT_PUBLIC_AUTHOR_EMAIL: z.string().email().default('hi@devlog.example'),

  // GitHub fallback stats
  GITHUB_STATS_FALLBACK_STARS: z.coerce.number().int().default(82400),
  GITHUB_STATS_FALLBACK_FORKS: z.coerce.number().int().default(4180),

  // Cron
  CRON_SECRET: z.string().optional(),

  // Dev-only override for the seeded author password (R-1).
  DEV_AUTHOR_PASSWORD: z.string().min(8).optional(),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Pure env parser — takes a record (usually `process.env`), applies the
 * schema defaults, and returns either the parsed value or the Zod issues.
 * Kept side-effect free so it is testable and importable anywhere.
 */
export function parseEnv(
  source: Record<string, string | undefined>,
): { ok: true; env: Env } | { ok: false; issues: z.ZodIssue[] } {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return { ok: true, env: parsed.data };
  return { ok: false, issues: parsed.error.issues };
}

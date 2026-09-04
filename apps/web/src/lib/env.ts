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

// R-41 (audit H-36): a production deployment whose NEXT_PUBLIC_SITE_URL
// is still the localhost default advertises the wrong origin in
// robots.txt, RSS, sitemap and canonical/OG tags (verified live in
// Pass 4). Warn loudly and actionably — this is deploy config, not
// something code can infer behind a proxy.
function warnIfLocalhostSiteUrlInProduction(env: Env): void {
  if (
    process.env.NODE_ENV === 'production' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)/.test(env.NEXT_PUBLIC_SITE_URL)
  ) {
    console.warn(
      '[env] NEXT_PUBLIC_SITE_URL is unset in production — falling back to the localhost default.\n' +
        `  Feeds (robots.txt, /rss.xml, /sitemap.xml) and canonical/OG tags will advertise "${env.NEXT_PUBLIC_SITE_URL}".\n` +
        '  Set NEXT_PUBLIC_SITE_URL=https://your-domain.com in the deploy environment.',
    );
  }
}

// R-73 (Pass 7, H-40): a `.env.local` line like `RESEND_API_KEY=` makes the
// var PRESENT-but-empty. Optional Zod validators (`.startsWith('re_')`,
// `.min(8)`) fail on `''`, which crashed every production build produced by
// the documented `cp .env.example .env.local` quick start. Normalize empty
// strings to absent ("empty = unset") before parsing; required secrets still
// fail loudly — an empty BETTER_AUTH_SECRET throws both here (absent →
// R-61 check) and via the Zod min(32) rule.
function withEmptyVarsUnset(
  source: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    normalized[key] = value === '' ? undefined : value;
  }
  return normalized;
}

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(withEmptyVarsUnset(process.env));
  if (parsed.success) {
    const absentCritical = [...SECURITY_CRITICAL_KEYS].filter(
      (k) => !parsed.data[k as keyof Env],
    );
    // R-61 (audit M-45): the secrets are `.optional()` in the schema, so
    // ABSENT values pass Zod — only present-but-short values fail. The
    // docs (AGENTS.md, README) promise a boot throw in production, but
    // pre-R-61 the fatal error surfaced at the first getSecret() call,
    // i.e. the first /admin/* request 500-ed on a "healthy" boot.
    if (process.env.NODE_ENV === 'production' && absentCritical.length > 0) {
      throw new Error(
        `Missing required environment variables in production:\n` +
          absentCritical.map((k) => `  - ${k}: must be set to a 32+ char secret`).join('\n'),
      );
    }
    // Dev: the header contract — "log a clear warning and fall back to
    // dev-only defaults" — only fired when parse FAILED, which absence
    // never did. Warn explicitly so a dev boot without secrets is loud.
    if (process.env.NODE_ENV !== 'production' && absentCritical.length > 0) {
      console.warn(
        `[env] Missing security-critical env vars in dev:\n` +
          absentCritical.map((k) => `  - ${k}`).join('\n') +
          `\n  Using dev-only fallback secrets. Set these in .env.local for production-equivalent dev.`,
      );
    }
    warnIfLocalhostSiteUrlInProduction(parsed.data);
    return parsed.data;
  }

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
  const env = EnvSchema.parse({});
  warnIfLocalhostSiteUrlInProduction(env);
  return env;
}

export const env = loadEnv();

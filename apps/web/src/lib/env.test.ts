/**
 * apps/web/src/lib/env.test.ts — R-41 (Pass 4, H-36).
 *
 * Pins the boot-time contract: in production, a localhost
 * NEXT_PUBLIC_SITE_URL (i.e. the env var was never set in the deploy
 * environment) emits an actionable console.warn — feeds, sitemap,
 * robots.txt and canonical/OG tags would otherwise advertise
 * http://localhost:3000 in production (exactly what the live site did).
 *
 * env.ts runs loadEnv() at import time, so each case uses a fresh
 * dynamic import after mutating process.env.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('env — R-61 missing production secrets throw at boot (M-45)', () => {
  const ORIGINALS = ['BETTER_AUTH_SECRET', 'SIGNED_TOKEN_SECRET', 'NEXT_PUBLIC_SITE_URL'] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.resetModules();
    for (const k of ORIGINALS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of ORIGINALS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.unstubAllEnvs();
  });

  it('throws at boot in production when BETTER_AUTH_SECRET is absent', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://programmer-blog.example';

    await expect(import('./env')).rejects.toThrow(/BETTER_AUTH_SECRET/);
  });

  it('throws at boot in production when SIGNED_TOKEN_SECRET is absent', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://programmer-blog.example';
    process.env.BETTER_AUTH_SECRET = 'x'.repeat(32);

    await expect(import('./env')).rejects.toThrow(/SIGNED_TOKEN_SECRET/);
  });

  it('boots cleanly in production with both secrets present', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://programmer-blog.example';
    process.env.BETTER_AUTH_SECRET = 'x'.repeat(32);
    process.env.SIGNED_TOKEN_SECRET = 'y'.repeat(32);

    const mod = await import('./env');
    expect(mod.env.BETTER_AUTH_SECRET).toHaveLength(32);
  });

  it('still boots without secrets in development (fallback + warning)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const mod = await import('./env');
    expect(mod.env).toBeTruthy();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('env — R-41 production localhost-URL warning (H-36)', () => {
  const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // R-61: production boot now throws on absent secrets. These tests
    // exercise the site-URL warning specifically, so supply the secrets.
    vi.stubEnv('NODE_ENV', 'production');
    process.env.BETTER_AUTH_SECRET = 'x'.repeat(32);
    process.env.SIGNED_TOKEN_SECRET = 'y'.repeat(32);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    if (ORIGINAL_SITE_URL === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
    }
    vi.unstubAllEnvs();
  });

  async function loadEnvFresh(): Promise<void> {
    await import('./env');
  }

  it('warns when production boots with the localhost default site URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    delete process.env.NEXT_PUBLIC_SITE_URL;

    await loadEnvFresh();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = warnSpy.mock.calls[0]?.join(' ') ?? '';
    expect(message).toContain('NEXT_PUBLIC_SITE_URL');
    expect(message).toContain('localhost');
  });

  it('warns for an explicit http://localhost production URL too', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

    await loadEnvFresh();

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when production sets a real site URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_SITE_URL = 'https://programmer-blog.example';

    await loadEnvFresh();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('stays quiet in development regardless of the site URL', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    delete process.env.NEXT_PUBLIC_SITE_URL;

    await loadEnvFresh();

    expect(warnSpy).not.toHaveBeenCalled();
  });
});

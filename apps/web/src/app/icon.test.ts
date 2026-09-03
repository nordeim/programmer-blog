/**
 * apps/web/src/app/icon.test.ts — favicon + manifest + robots (R-15).
 *
 * Guards: (a) icon.svg exists and is valid SVG, (b) manifest.ts exports
 * a well-formed PWA manifest with brand colors + icon entries,
 * (c) the robots route handler exists (served at /api/robots.txt).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { manifest } from './manifest';

const appDir = __dirname;

describe('favicon (R-15)', () => {
  it('ships src/app/icon.svg as a valid SVG', () => {
    const p = join(appDir, 'icon.svg');
    expect(existsSync(p)).toBe(true);
    const svg = readFileSync(p, 'utf8');
    expect(svg).toMatch(/^<svg/);
    expect(svg).toContain('</svg>');
  });
});

describe('web manifest (R-15)', () => {
  it('exports name/short_name/start_url/display/theme colors', () => {
    expect(manifest.name).toBe('/dev/log — Notes from a Programmer');
    expect(manifest.short_name).toBe('/dev/log');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('lists at least one icon with a valid purpose and type', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    const icons = manifest.icons!;
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect(icon.src).toMatch(/^\//);
      expect(icon.type).toBe('image/svg+xml');
      expect(['any', 'maskable']).toContain(icon.purpose);
      // 'any' is valid for SVG; numeric sizes must parse.
      expect(icon.sizes === 'any' || Number(icon.sizes) > 0).toBe(true);
    }
  });
});

describe('robots.txt route (R-15)', () => {
  it('has the route handler file', () => {
    expect(existsSync(join(appDir, 'api/robots.txt/route.ts'))).toBe(true);
  });
});

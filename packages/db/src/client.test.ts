/**
 * packages/db/src/client.test.ts — R-38 (Pass 4) integration tests.
 *
 * Pins the C-36 contract: the client must FAIL FAST with an actionable
 * error when the resolved SQLite file does not exist. better-sqlite3
 * would otherwise silently CREATE an empty database, and every query
 * then fails at runtime with "no such table: <t>" — which is exactly
 * how the production /archive + /posts/[slug] 500s (empty deployed DB)
 * shipped invisibly.
 *
 * Runs in its own vitest file so the per-process `globalThis` client
 * cache and the module-level DATABASE_PATH are fresh for these cases.
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const tmpDir = mkdtempSync(join(tmpdir(), 'devlog-client-'));
// The parent directory EXISTS (as it does for any deployed CWD) — only the
// file is missing. This is the exact production shape of C-36: better-sqlite3
// silently CREATES the file and every later query fails with "no such table".
const missingPath = join(tmpDir, 'missing.db');

process.env.DATABASE_PATH = missingPath;

import { db, openDatabaseForMigrations } from './client';

const cachedClientKey = '__devlog_db' as const;

function resetClientCache(): void {
  Reflect.deleteProperty(globalThis, cachedClientKey);
}

beforeEach(() => {
  resetClientCache();
});

afterAll(() => {
  delete process.env.DATABASE_PATH;
});

describe('db client — R-38 / C-36 (fail fast on missing database file)', () => {
  it('throws an actionable error on first access when the file does not exist (does NOT silently create an empty DB)', () => {
    expect(() => {
      // First property access triggers createDrizzleClient() via the proxy.
      void (db as unknown as Record<string, unknown>).select;
    }).toThrowError(/does not exist/);
  });

  it('the error names the resolved path and the remedy', () => {
    try {
      void (db as unknown as Record<string, unknown>).select;
      expect.unreachable('expected the missing-DB access to throw');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).toContain('missing.db');
      expect(message).toContain('DATABASE_PATH');
      expect(message).toContain('db:migrate');
    }
  });
});

describe('db client — positive case (R-38 must not break normal opens)', () => {
  it('opens normally when the database file exists', () => {
    // An existing (migrated) file is the legitimate target. Create a real,
    // zero-length SQLite file — SQLite treats it as an empty database.
    const existingDir = mkdtempSync(join(tmpdir(), 'devlog-existing-'));
    const existingPath = join(existingDir, 'existing.db');
    writeFileSync(existingPath, '');

    process.env.DATABASE_PATH = existingPath;
    resetClientCache();

    expect(() => {
      void (db as unknown as Record<string, unknown>).select;
    }).not.toThrow();
  });

  it('never writes the client cache when creation throws', () => {
    process.env.DATABASE_PATH = missingPath;
    resetClientCache();
    expect(() => {
      void (db as unknown as Record<string, unknown>).select;
    }).toThrow();
    expect(globalThis[cachedClientKey]).toBeUndefined();
  });

  it('the migrations bootstrap path (openDatabaseForMigrations) MAY create the file — R-38 must not break db:migrate', () => {
    process.env.DATABASE_PATH = missingPath;
    expect(() => {
      void (openDatabaseForMigrations() as unknown as Record<string, unknown>).select;
    }).not.toThrow();
    // And the created file now exists for the runtime client.
    resetClientCache();
    expect(() => {
      void (db as unknown as Record<string, unknown>).select;
    }).not.toThrow();
  });
});

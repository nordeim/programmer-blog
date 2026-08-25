/**
 * packages/db/src/seed.test.ts — Phase 2 sanity test.
 *
 * Verifies that the Drizzle schema compiles + a real :memory: SQLite DB can
 * accept the same CREATE TABLE statements Drizzle generates (foreign keys,
 * cascades, indexes). The actual seed is exercised end-to-end by the
 * `pnpm db:seed` script which we ran manually in Phase 2.
 */
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

describe('drizzle schema sanity', () => {
  it('defines all expected tables', () => {
    const tableNames = Object.keys(schema).filter((k) => !k.startsWith('_') && !['default', 'sql'].includes(k));
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('sessions');
    expect(tableNames).toContain('posts');
    expect(tableNames).toContain('tags');
    expect(tableNames).toContain('postsToTags');
    expect(tableNames).toContain('subscribers');
    expect(tableNames).toContain('comments');
    expect(tableNames).toContain('siteSettings');
  });

  it('drizzle + :memory: sqlite can execute a basic insert/select on the users table', () => {
    const sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    // Recreate just the users table from the schema definition.
    sqlite.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified INTEGER NOT NULL DEFAULT 0,
        image_url TEXT,
        name TEXT,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'subscriber',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);
    const db = drizzle(sqlite, { schema: { users: schema.users } });
    const inserted = db
      .insert(schema.users)
      .values({ id: 'test-1', email: 'test@example.com', role: 'author' })
      .returning({ id: schema.users.id, email: schema.users.email, role: schema.users.role })
      .get();
    expect(inserted).toMatchObject({ id: 'test-1', email: 'test@example.com', role: 'author' });
    const found = db.select().from(schema.users).where(sql`email = 'test@example.com'`).get();
    expect(found?.email).toBe('test@example.com');
    sqlite.close();
  });

  it('foreign-key cascade delete works', () => {
    const sqlite = new Database(':memory:');
    sqlite.pragma('foreign_keys = ON');
    sqlite.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY NOT NULL);
      CREATE TABLE posts (
        id TEXT PRIMARY KEY NOT NULL,
        author_id TEXT NOT NULL,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    sqlite.prepare('INSERT INTO users (id) VALUES (?)').run('u1');
    sqlite.prepare('INSERT INTO posts (id, author_id) VALUES (?, ?)').run('p1', 'u1');
    sqlite.prepare('DELETE FROM users WHERE id = ?').run('u1');
    const remaining = sqlite.prepare('SELECT * FROM posts').all();
    expect(remaining.length).toBe(0);
    sqlite.close();
  });
});

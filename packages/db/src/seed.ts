/**
 * packages/db/src/seed.ts — seed mockup data.
 *
 * Inserts 9 posts (mockup article cards + archive items, FR-8/FR-11), 12 tags,
 * 1 author user, 3 subscribers, 2 comments, and 1 site_settings row. Snippets
 * are NOT seeded — they are MDX files under apps/web/content/snippets/.
 *
 * Idempotent: checks if data exists before inserting. Re-running it does nothing.
 *
 * Exposes `runSeed()` — called by apps/web/src/scripts/seed.ts via `pnpm db:seed`.
 *
 * R-57 (audit C-38): the author password is resolved by `resolveAuthorPassword()`
 * — production seeds without an explicit DEV_AUTHOR_PASSWORD throw instead of
 * silently using the publicly-known dev default.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { desc, eq } from 'drizzle-orm';

import { db } from './client';
import { hashPassword } from './password';
import { comments, posts, postsToTags, siteSettings, subscribers, tags, users } from './schema';

/**
 * The documented dev-only default author password. Public in the repo by
 * design (it is a dev convenience); R-57 (audit C-38) guarantees it can
 * never silently guard a production seed.
 */
export const DEFAULT_DEV_AUTHOR_PASSWORD = 'dev-password-12345';

/**
 * R-57 (audit C-38): resolve the author password for `runSeed()`.
 *
 * - `DEV_AUTHOR_PASSWORD` always wins — including production, where
 *   `start_server.sh` generates a strong random value when the operator
 *   has not set one.
 * - Outside production, fall back to the documented dev default so
 *   `pnpm dev` + the login-page hint keep working out of the box.
 * - In production WITHOUT the var: throw. Seeding the internet-facing
 *   author account with a password that is public in the repo is a
 *   critical takeover vector (posts CRUD, comment moderation, subscriber
 *   PII export), and there is no in-app password-change UI to recover.
 * - The known default explicitly re-set in production is also refused —
 *   it means the env propagated a dev value to a prod deploy.
 */
export function resolveAuthorPassword(
  env: { NODE_ENV?: string | undefined; DEV_AUTHOR_PASSWORD?: string | undefined } = process.env,
): string {
  const provided = env.DEV_AUTHOR_PASSWORD;
  if (env.NODE_ENV === 'production') {
    // R-92 (Pass 7, L-55): R-57 rejected only the exact public default —
    // a 10-char password from the deploy env sailed through. Production
    // credentials need a real strength floor.
    if (!provided || provided === DEFAULT_DEV_AUTHOR_PASSWORD || provided.length < 16) {
      throw new Error(
        '[seed] Refusing to seed a production database with a weak or publicly-known author password.\n' +
          '  Set DEV_AUTHOR_PASSWORD to a strong unique value (at least 16 chars) in the deploy environment, e.g.:\n' +
          '    DEV_AUTHOR_PASSWORD="$(openssl rand -base64 24)" pnpm db:seed\n' +
          '  `bash start_server.sh` does this automatically when the var is absent.',
      );
    }
    return provided;
  }
  if (provided) {
    return provided;
  }
  return DEFAULT_DEV_AUTHOR_PASSWORD;
}

const TAG_SEED: { slug: string; name: string }[] = [
  { slug: 'javascript', name: 'JavaScript' },
  { slug: 'typescript', name: 'TypeScript' },
  { slug: 'rust', name: 'Rust' },
  { slug: 'go', name: 'Go' },
  { slug: 'compilers', name: 'Compilers' },
  { slug: 'error-handling', name: 'Error Handling' },
  { slug: 'react', name: 'React' },
  { slug: 'architecture', name: 'Architecture' },
  { slug: 'systems', name: 'Systems' },
  { slug: 'memory', name: 'Memory' },
  { slug: 'career', name: 'Career' },
  { slug: 'tools', name: 'Tools' },
];

const POST_SEED: {
  slug: string;
  title: string;
  excerpt: string;
  contentMdx: string;
  publishedAt: Date | null;
  status: 'draft' | 'published' | 'archived';
  readingTimeMinutes: number;
  tags: string[];
}[] = [
  {
    slug: 'on-the-quiet-violence-of-implicit-conversions',
    title: 'On the Quiet Violence of Implicit Conversions',
    excerpt:
      "JavaScript will let you add `[]` to `{}` and thank you for it. A field guide to footguns.",
    contentMdx: `# On the Quiet Violence of Implicit Conversions

JavaScript will let you add \`[]\` to \`{}\` and thank you for it. A field guide to footguns.

\`\`\`ts
const x = [] + {};
// "[object Object]" — yes, really.
\`\`\`

In this essay, we walk through the coercion rules, the spec line that
makes \`[] + {}\` evaluate to \`"[object Object]"\`, and how to never let
this footgun ship to production.`,
    publishedAt: new Date('2024-11-12T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 8,
    tags: ['javascript'],
  },
  {
    slug: 'a-lexer-by-hand-on-a-sunday-afternoon',
    title: 'A Lexer, By Hand, On a Sunday Afternoon',
    excerpt:
      'Skip the regex. Skip the generator. Two hundred lines of switch statements and you\'ll understand something new about every language you\'ve ever used.',
    contentMdx: `# A Lexer, By Hand, On a Sunday Afternoon

Skip the regex. Skip the generator. Two hundred lines of switch statements
and you'll understand something new about every language you've ever used.

\`\`\`ts
function lex(src: string): Token[] {
  // ...
}
\`\`\`

What follows is a Sunday-afternoon project that took me from
"language internals are spooky" to "oh, this is just a state machine."`,
    publishedAt: new Date('2024-10-28T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 14,
    tags: ['compilers'],
  },
  {
    slug: 'why-i-removed-every-try-catch-from-my-codebase',
    title: 'Why I Removed Every Try/Catch From My Codebase',
    excerpt:
      'Result types, error channels, and the curious peace of letting things crash loudly in development.',
    contentMdx: `# Why I Removed Every Try/Catch From My Codebase

Result types, error channels, and the curious peace of letting things
crash loudly in development.

\`\`\`ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
\`\`\``,
    publishedAt: new Date('2024-10-14T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 6,
    tags: ['error-handling'],
  },
  // The 6 mockup archive items
  {
    slug: 'the-hidden-cost-of-abstraction',
    title: 'The Hidden Cost of Abstraction',
    excerpt:
      'Every layer you add is a layer you\'ll debug. A meditation on when to stop.',
    contentMdx: `# The Hidden Cost of Abstraction\n\nEvery layer you add is a layer you'll debug.`,
    publishedAt: new Date('2024-09-30T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 11,
    tags: ['architecture'],
  },
  {
    slug: 'plain-text-will-outlive-us-all',
    title: 'Plain Text Will Outlive Us All',
    excerpt:
      'On choosing formats that your grandchildren\'s operating system can still open.',
    contentMdx: `# Plain Text Will Outlive Us All\n\nOn choosing formats wisely.`,
    publishedAt: new Date('2024-09-18T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 5,
    tags: ['tools'],
  },
  {
    slug: 'garbage-collection-but-make-it-personal',
    title: 'Garbage Collection, But Make It Personal',
    excerpt:
      'What tracing collectors can teach you about letting go of side projects.',
    contentMdx: `# Garbage Collection, But Make It Personal\n\nWhat collectors teach us about life.`,
    publishedAt: new Date('2024-09-02T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 9,
    tags: ['memory'],
  },
  {
    slug: 'a-letter-to-junior-me-about-imposter-syndrome',
    title: 'A Letter to Junior Me About Imposter Syndrome',
    excerpt:
      'Eight things I wish someone had told me in my first year of writing code for money.',
    contentMdx: `# A Letter to Junior Me About Imposter Syndrome\n\nDear younger me,`,
    publishedAt: new Date('2024-08-21T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 7,
    tags: ['career'],
  },
  {
    slug: 'i-wrote-a-database-in-200-lines-of-go',
    title: 'I Wrote a Database in 200 Lines of Go',
    excerpt:
      'A WAL, an LSM-tree, and a HTTP API. Surprised how far you can get on a Saturday.',
    contentMdx: `# I Wrote a Database in 200 Lines of Go\n\nWAL + LSM + HTTP.`,
    publishedAt: new Date('2024-08-07T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 16,
    tags: ['systems'],
  },
  {
    slug: 'stop-using-useeffect-for-everything',
    title: 'Stop Using useEffect for Everything',
    excerpt:
      'Most effects are an admission that your state model is wrong. A re-education.',
    contentMdx: `# Stop Using useEffect for Everything\n\nMost effects are an admission that your state model is wrong.`,
    publishedAt: new Date('2024-07-24T00:00:00Z'),
    status: 'published',
    readingTimeMinutes: 6,
    tags: ['react'],
  },
];

const COMMENT_SEED: {
  postSlug: string;
  authorName: string;
  authorEmail: string;
  body: string;
  status: 'pending' | 'approved' | 'spam' | 'deleted';
}[] = [
  {
    postSlug: 'on-the-quiet-violence-of-implicit-conversions',
    authorName: 'Test Reader',
    authorEmail: 'reader@example.com',
    body: 'This finally made coercion click. Thank you.',
    status: 'approved',
  },
  {
    postSlug: 'a-lexer-by-hand-on-a-sunday-afternoon',
    authorName: 'Another Reader',
    authorEmail: 'reader2@example.com',
    body: 'I tried this and now I have a 400-line JSON parser. Oops.',
    status: 'pending',
  },
];

const SUBSCRIBER_SEED: {
  email: string;
  status: 'pending' | 'confirmed' | 'unsubscribed' | 'bounced';
  confirmToken?: string;
  unsubscribeToken?: string;
}[] = [
  {
    email: 'subscriber1@example.com',
    status: 'confirmed',
    confirmToken: 'test-token-confirmed-1',
    unsubscribeToken: 'test-unsub-1',
  },
  {
    email: 'subscriber2@example.com',
    status: 'pending',
    confirmToken: 'test-token-pending-2',
    unsubscribeToken: 'test-unsub-2',
  },
  {
    email: 'subscriber3@example.com',
    status: 'unsubscribed',
    confirmToken: 'test-token-unsub-3',
    unsubscribeToken: 'test-unsub-3',
  },
];

export async function runSeed(): Promise<void> {
  console.log('[seed] Starting...');

  // ── Site settings (single row) ────────────────────────────────────────────
  const existingSettings = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).get();
  if (!existingSettings) {
    await db
      .insert(siteSettings)
      .values({
        id: 1,
        authorName: 'Alex Rivera',
        authorBio: 'Software engineer writing about the craft.',
        socialLinks: {
          github: 'https://github.com/tailwindlabs/tailwindcss',
          twitter: 'https://twitter.com',
          rss: '/rss.xml',
          email: 'hi@devlog.example',
        },
        defaultSeoDescription:
          "Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am.",
        defaultOgImageUrl: null,
      })
      .run();
    console.log('[seed] Inserted site_settings');
  }

  // ── Author user ──────────────────────────────────────────────────────────
  const existingAuthor = await db.select().from(users).where(eq(users.role, 'author')).get();
  let authorId = existingAuthor?.id;
  if (!existingAuthor) {
    // R-1 (audit remediation): compute a real scrypt hash of the dev password
    // at seed time, so the auth flow can verify with verifyPassword().
    // Format: scrypt:N:r:p:salt-hex:hash-hex — matches packages/auth/src/password.ts.
    const devPassword = resolveAuthorPassword();
    const authorHash = hashPassword(devPassword);
    const result = await db
      .insert(users)
      .values({
        email: 'author@devlog.example',
        name: 'Alex Rivera',
        role: 'author',
        passwordHash: authorHash,
        emailVerified: true,
      })
      .returning({ id: users.id })
      .get();
    authorId = result?.id;
    console.log('[seed] Inserted author user', authorId);
  } else {
    console.log('[seed] Author user already exists, skipping');
  }
  if (!authorId) throw new Error('[seed] Failed to get/create author user');

  // ── Tags ──────────────────────────────────────────────────────────────────
  const existingTags = await db.select().from(tags).all();
  const tagSlugToId = new Map(existingTags.map((t) => [t.slug, t.id]));

  for (const tag of TAG_SEED) {
    if (!tagSlugToId.has(tag.slug)) {
      const result = await db.insert(tags).values(tag).returning({ id: tags.id }).get();
      if (result?.id) tagSlugToId.set(tag.slug, result.id);
    }
  }
  console.log('[seed] Tags:', tagSlugToId.size);

  // ── Posts + post-to-tag links ─────────────────────────────────────────────
  const existingPosts = await db.select().from(posts).all();
  const postSlugToId = new Map(existingPosts.map((p) => [p.slug, p.id]));

  for (const post of POST_SEED) {
    if (!postSlugToId.has(post.slug)) {
      const result = await db
        .insert(posts)
        .values({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          contentMdx: post.contentMdx,
          status: post.status,
          publishedAt: post.publishedAt,
          readingTimeMinutes: post.readingTimeMinutes,
          authorId,
        })
        .returning({ id: posts.id })
        .get();
      if (result?.id) {
        postSlugToId.set(post.slug, result.id);
        // Link tags
        for (const tagSlug of post.tags) {
          const tagId = tagSlugToId.get(tagSlug);
          if (tagId) {
            await db.insert(postsToTags).values({ postId: result.id, tagId }).run();
          }
        }
      }
    }
  }
  console.log('[seed] Posts:', postSlugToId.size);

  // ── Comments ───────────────────────────────────────────────────────────────
  const existingComments = await db.select().from(comments).get();
  if (!existingComments) {
    for (const c of COMMENT_SEED) {
      const postId = postSlugToId.get(c.postSlug);
      if (!postId) continue;
      await db
        .insert(comments)
        .values({
          postId,
          authorName: c.authorName,
          authorEmail: c.authorEmail,
          body: c.body,
          status: c.status,
        })
        .run();
    }
    console.log('[seed] Comments:', COMMENT_SEED.length);
  }

  // ── Subscribers ─────────────────────────────────────────────────────────────
  const existingSubscribers = await db.select().from(subscribers).all();
  if (existingSubscribers.length === 0) {
    for (const s of SUBSCRIBER_SEED) {
      const now = new Date();
      await db
        .insert(subscribers)
        .values({
          email: s.email,
          status: s.status,
          confirmToken: s.confirmToken,
          unsubscribeToken: s.unsubscribeToken,
          confirmedAt: s.status === 'confirmed' ? now : null,
          preferences: { frequency: 'weekly' },
        })
        .run();
    }
    console.log('[seed] Subscribers:', SUBSCRIBER_SEED.length);
  }

  // ── Stats summary ─────────────────────────────────────────────────────────
  const allPosts = await db.select().from(posts).orderBy(desc(posts.publishedAt)).all();
  const allTags = await db.select().from(tags).all();
  const allSubscribers = await db.select().from(subscribers).all();
  const allComments = await db.select().from(comments).all();
  console.log('\n[seed] Done. Final counts (totals in file — not delta):');
  console.log(`  - users:        ${1} (author)`);
  console.log(`  - posts:        ${allPosts.length}`);
  console.log(`  - tags:         ${allTags.length}`);
  console.log(`  - subscribers:  ${allSubscribers.length} (seed inserts ${SUBSCRIBER_SEED.length} only when empty — higher totals mean a dirty DB)`);
  console.log(`  - comments:     ${allComments.length} (seed inserts ${COMMENT_SEED.length} only when empty)`);
  console.log(`  - site_settings: 1`);
}

// If invoked directly via `tsx packages/db/src/seed.ts`, run the seed.
// When imported by apps/web/src/scripts/seed.ts, the caller invokes runSeed().
// R-67 (audit L-42): pathToFileURL instead of string concat — the raw
// `file://${argv[1]}` comparison breaks on spaces / percent-encoding.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runSeed().catch((err) => {
    console.error('[seed] Failed:', err);
    process.exit(1);
  });
}


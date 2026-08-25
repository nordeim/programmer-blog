# `/dev/log` — Master Execution Plan (MEP) v1.0

**Project:** `/dev/log — Notes from a Programmer's Desk`
**Classification:** Internal Engineering Reference
**Status:** DEFINITIVE, PRODUCTION-LOCKED BLUEPRINT
**Companion Document:** `Project_Requirements_Document.md` (PRD), `Project_Architecture_Document.md` (PAD)
**Last Updated:** 2026-08-26
**Audience:** Senior Engineers, Tech Leads, AI Coding Agents

> **How to use this document.** The MEP defines *in what order* we build `/dev/log`. Each phase has: a goal, a list of files to create or update (with purpose and feature notes), a TDD checklist (RED → GREEN → REFACTOR), and an acceptance gate. Phases are sequential — do not start Phase N+1 until Phase N's acceptance gate is green. Each phase ends with a commit (or several atomic commits) to `main`.

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Phase 1 — Monorepo Scaffolding & Tooling](#2-phase-1--monorepo-scaffolding--tooling)
3. [Phase 2 — Database, Drizzle, Migrations, Seed](#3-phase-2--database-drizzle-migrations-seed)
4. [Phase 3 — Core UI Primitives & Theme System](#4-phase-3--core-ui-primitives--theme-system)
5. [Phase 4 — Dynamic Landing Page (TDD, Mockup-Faithful)](#5-phase-4--dynamic-landing-page-tdd-mockup-faithful)
6. [Phase 5 — Blog Surface (Archive, Posts, Snippets, RSS, Sitemap)](#6-phase-5--blog-surface-archive-posts-snippets-rss-sitemap)
7. [Phase 6 — Auth, Admin, Email, Subscribers](#7-phase-6--auth-admin-email-subscribers)
8. [Phase 7 — Tests, Lint, Typecheck, Build, Lighthouse](#8-phase-7--tests-lint-typecheck-build-lighthouse)
9. [Phase 8 — Validation & Git Push](#9-phase-8--validation--git-push)
10. [Risk Register](#10-risk-register)
11. [Commit Cadence & Message Conventions](#11-commit-cadence--message-conventions)

---

## 1. Phase Overview

| Phase | Goal | Files (new/changed) | Tests | Commit Cadence | Acceptance Gate |
|-------|------|---------------------|-------|-----------------|-----------------|
| 1 | Scaffold the Turborepo + pnpm workspace, Next.js 16 app, TS, ESLint, Prettier, Vitest | ~25 | 1 (smoke) | 4 atomic | `pnpm dev` boots a 200 OK page printing `/dev/log`. |
| 2 | Drizzle schema, migrations, seed, better-auth instance | ~15 | ~15 | 3 atomic | `pnpm db:migrate && pnpm db:seed` succeeds; DB tests pass. |
| 3 | shadcn primitives, Tailwind v4 @theme, custom components, fonts | ~30 | ~20 | 4 atomic | Storybook-like isolation render of every primitive. |
| 4 | Landing page: all FR-1 through FR-16 | ~25 | ~25 | 6 atomic | Pixel-compare to mockup at 375/768/1280px in all 3 themes. |
| 5 | Blog pages: archive, posts/[slug], snippets, rss, sitemap | ~20 | ~15 | 4 atomic | All routes return 200 with seeded data. |
| 6 | Better Auth flows, admin surface, Resend email, subscribers | ~30 | ~20 | 5 atomic | Subscribe → confirm → email arrives in Resend sandbox. Admin login works. |
| 7 | Coverage gap-closing, Lighthouse, final gates | ~10 patches | ~10 | 2 atomic | All CI gates green; Lighthouse ≥ 95. |
| 8 | MEP review, PRD/PAD review, git commit, SSH push | — | — | 1 final | Commits on `main`; push to GitHub succeeds. |

**Total files touched (new + edited):** ~155
**Total new tests:** ~110
**Total atomic commits:** ~25–30

---

## 2. Phase 1 — Monorepo Scaffolding & Tooling

### Goal

Stand up a working Turborepo + pnpm workspace with one Next.js 16 app (`apps/web`) and four empty package skeletons (`packages/db`, `packages/auth`, `packages/email`, `packages/types`, `packages/config`). After this phase, `pnpm dev` boots `http://localhost:3000` and renders a placeholder page that says `/dev/log`. All tooling (TypeScript, ESLint, Prettier, Vitest, Tailwind v4, PostCSS) is configured and the smoke test passes.

### Files to Create

| # | Path | Purpose & Features |
|---|------|--------------------|
| 1 | `package.json` (root) | Workspace manifest. Defines `pnpm` workspace scripts (`dev`, `build`, `lint`, `test`, `check-types`, `db:*`, `clean`, `check`), `devDependencies` (turbo, typescript, prettier, eslint, vitest), `packageManager: pnpm@9.15.x`, `engines: { node: '>=20' }`. |
| 2 | `pnpm-workspace.yaml` | Workspace globs: `apps/*` and `packages/*`. |
| 3 | `turbo.json` | Task graph. `build` (depends on `^build`), `dev` (persistent, cache=false), `lint`, `test`, `check-types`, `db:generate`, `db:migrate`, `db:seed`, `clean`. Each task has appropriate `inputs`/`outputs` for cache hits. |
| 4 | `tsconfig.base.json` | Shared TS options: `strict: true`, `noUncheckedIndexedAccess: true`, `erasableSyntaxOnly: true`, `module: preserve`, `moduleResolution: bundler`, `target: ES2022`, `lib: ['dom', 'dom.iterable', 'ES2022']`, `paths` for `@devlog/*` imports. |
| 5 | `.nvmrc` | `20` — pins Node version for `nvm use`. |
| 6 | `.gitignore` | Ignores `node_modules`, `.next`, `.turbo`, `dist`, `coverage`, `.env.local`, `*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`, `.DS_Store`. |
| 7 | `.env.example` | Documents every env var from PAD §9.2. No real values — placeholders with comments. |
| 8 | `.prettierrc` | Prettier config: `semi: true`, `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`, `plugins: ['prettier-plugin-tailwindcss']`. |
| 9 | `.prettierignore` | Ignores `.next`, `node_modules`, `dist`, `coverage`, `skills/`, `landing_page_mockup.html`. |
| 10 | `apps/web/package.json` | App manifest. `dependencies`: `next@^16`, `react@^19`, `react-dom@^19`, `drizzle-orm`, `better-sqlite3`, `better-auth`, `resend`, `zod`, `zustand`, `shiki`, `next-mdx-remote`, `react-email`. `devDependencies`: `typescript`, `vitest`, `jsdom`, `@testing-library/react`, `@types/better-sqlite3`, `tailwindcss@^4`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`. |
| 11 | `apps/web/tsconfig.json` | Extends `../../tsconfig.base.json`. Adds `jsx: preserve`, `plugins: [{ name: 'next' }]`, `paths` mapping `@/*` to `./src/*` and `@devlog/*` to `../../packages/*/src`. |
| 12 | `apps/web/next.config.ts` | Next.js config: `reactStrictMode: true`, `output: 'standalone'`, `transpilePackages: ['@devlog/db', '@devlog/auth', '@devlog/email', '@devlog/types', '@devlog/config']`, `mdxRs: true`, `experimental: { ppr: 'incremental' }` (if Next.js 16 supports it), `images: { formats: ['image/avif', 'image/webp'] }`, `headers()` returning CSP + security headers (PAD §6.1). |
| 13 | `apps/web/postcss.config.mjs` | PostCSS config: `plugins: { '@tailwindcss/postcss': {} }`. |
| 14 | `apps/web/eslint.config.mjs` | Extends `@devlog/config/eslint/base.mjs` (the shared base) + `next/core-web-vitals`. |
| 15 | `apps/web/vitest.config.ts` | Vitest config: `environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, `coverage: { provider: 'v8', reporter: ['text', 'html', 'lcov'], thresholds: { statements: 80, branches: 75, functions: 80, lines: 80 } }`, `alias: { '@': './src', '@devlog/db': '../../packages/db/src' }`. |
| 16 | `apps/web/vitest.setup.ts` | Imports `@testing-library/jest-dom`, polyfills `matchMedia`, `IntersectionObserver`, `ResizeObserver`, `navigator.clipboard` for jsdom. |
| 17 | `apps/web/src/app/layout.tsx` | Root layout: loads fonts via `next/font/local` (Fraunces, JetBrains Mono, Space Grotesk), reads theme cookie (PAD §3.3 Pattern 1), wraps children in `<ThemeProvider>`. Sets `<html lang="en" data-theme={initialTheme} suppressHydrationWarning>`. Exports `metadata` (title, description, OpenGraph). |
| 18 | `apps/web/src/app/page.tsx` | Landing page placeholder: `<h1 className="font-mono">/dev/log<span className="logo-cursor" /></h1>`. Will be replaced in Phase 4. |
| 19 | `apps/web/src/app/globals.css` | Empty Tailwind v4 `@import 'tailwindcss';` + `@theme { ... }` block (will be filled in Phase 3). For Phase 1: just `@import 'tailwindcss';` + minimal `:root[data-theme="dark"] { --bg: #0c0b09; --fg: #f0ead6; }` + `body { background: var(--bg); color: var(--fg); }`. |
| 20 | `apps/web/src/lib/env.ts` | Zod schema for env vars (PAD §9.2). Throws on missing required vars. Exports `env` object. |
| 21 | `packages/config/package.json` | Manifest for the shared config package. `name: @devlog/config`. No `dependencies`. |
| 22 | `packages/config/eslint/base.mjs` | Shared ESLint flat config base: `typescript-eslint` (strict + stylistic), `jsx-a11y`, custom rules: ban `any`, ban `@ts-ignore` without justification, ban `dangerouslySetInnerHTML`, ban raw SQL strings (regex). |
| 23 | `packages/config/tsconfig/base.json` | Shared TS compiler options (matches `tsconfig.base.json` content). |
| 24 | `packages/config/tsconfig/nextjs.json` | Extends `base.json`. Adds `jsx: preserve`, `plugins: [{ name: 'next' }]`, `allowJs: false`. |
| 25 | `packages/config/tsconfig/react-library.json` | Extends `base.json`. Adds `jsx: react-jsx`, `declaration: true`, `composite: true`. For `packages/db`, `packages/auth`, `packages/email`, `packages/types`. |
| 26 | `packages/db/package.json` | `name: @devlog/db`. `main: ./src/index.ts`. `dependencies: drizzle-orm, better-sqlite3`. `devDependencies: drizzle-kit, @types/better-sqlite3`. |
| 27 | `packages/db/tsconfig.json` | Extends `@devlog/config/tsconfig/react-library.json`. |
| 28 | `packages/db/src/index.ts` | Re-exports `./client`, `./schema`, `./queries` (placeholder until Phase 2). |
| 29 | `packages/auth/package.json` | `name: @devlog/auth`. `dependencies: better-auth, @devlog/db, @devlog/types`. |
| 30 | `packages/auth/tsconfig.json` | Extends react-library. |
| 31 | `packages/auth/src/index.ts` | Placeholder. |
| 32 | `packages/email/package.json` | `name: @devlog/email`. `dependencies: resend, react-email`. |
| 33 | `packages/email/tsconfig.json` | Extends react-library. |
| 34 | `packages/email/src/index.ts` | Placeholder. |
| 35 | `packages/types/package.json` | `name: @devlog/types`. `dependencies: zod`. |
| 36 | `packages/types/src/index.ts` | Placeholder. |
| 37 | `apps/web/src/app/page.test.tsx` | Smoke test: renders `/` and asserts the page contains `/dev/log`. (This is the RED→GREEN test for Phase 1.) |
| 38 | `README.md` | Project README: one-paragraph description, link to PRD/PAD/MEP, setup commands (PAD §10.1). |
| 39 | `.husky/pre-commit` | Husky pre-commit hook: runs `lint-staged`. |
| 40 | `.husky/commit-msg` | Husky commit-msg hook: runs `commitlint`. |
| 41 | `commitlint.config.mjs` | Conventional Commits config (`@commitlint/config-conventional`). |
| 42 | `.lintstagedrc` | `lint-staged` config: `'*.{ts,tsx}': ['prettier --write', 'eslint --fix'], '*.{css,md,json}': ['prettier --write']`. |

### Phase 1 TDD Checklist

Follow RED → GREEN → REFACTOR for every step. Each row is a single TDD cycle.

- [ ] **RED 1.1:** Write `apps/web/src/app/page.test.tsx` that asserts `render(<Page />).container.textContent` contains `/dev/log`. Run `pnpm test` → fails (no Page component exists yet).
- [ ] **GREEN 1.1:** Create `apps/web/src/app/page.tsx` with the placeholder. Run `pnpm test` → passes.
- [ ] **REFACTOR 1.1:** No refactor needed for placeholder.

### Phase 1 Acceptance Gate

- [ ] `pnpm install` succeeds with 0 errors, 0 peer-dep warnings.
- [ ] `pnpm check-types` is green.
- [ ] `pnpm lint` is green (0 errors).
- [ ] `pnpm test` passes (1 smoke test).
- [ ] `pnpm dev` boots on `http://localhost:3000`. Page renders `/dev/log█` with blinking cursor.
- [ ] `pnpm build` succeeds. `apps/web/.next/` exists.
- [ ] Commit 1: `feat(scaffold): initialize Turborepo + Next.js 16 + TS strict base`.
- [ ] Commit 2: `feat(scaffold): add ESLint flat config + Prettier + Husky hooks`.
- [ ] Commit 3: `feat(scaffold): add Vitest + jsdom + smoke test for /`.
- [ ] Commit 4: `feat(scaffold): add Tailwind v4 + PostCSS + minimal dark theme`.

---

## 3. Phase 2 — Database, Drizzle, Migrations, Seed

### Goal

Stand up the data layer. Drizzle schema in `packages/db/src/schema.ts` defines all tables (users, sessions, posts, tags, postsToTags, subscribers, comments, site_settings). Migrations are generated and applied. Seed data populates the database with the 3 mockup article cards, the 6 mockup archive items, 5 mockup snippets, and 1 author user. Better Auth is instantiated with email/password + RBAC plugin. All schema and seed logic has tests.

### Files to Create / Update

| # | Path | Purpose & Features |
|---|------|--------------------|
| 1 | `packages/db/src/schema.ts` | All tables per PAD §4.1. Each table uses `sqliteTable`. Columns: `text().primaryKey()`, `text().notNull()`, `integer().notNull()`, `text().unique()`, etc. Foreign keys via `references(() => users.id, { onDelete: 'cascade' })`. The `postsToTags` join table has a composite primary key. |
| 2 | `packages/db/drizzle.config.ts` | Drizzle Kit config: `dialect: 'sqlite'`, `schema: './src/schema.ts'`, `out: './migrations'`, `dbCredentials: { url: process.env.DATABASE_PATH \|\| './devlog.db' }`. |
| 3 | `packages/db/migrations/0000_initial.sql` | Generated by `pnpm db:generate`. CREATE TABLE for all tables + indexes (`posts.slug`, `posts.status_published_at`, `subscribers.email`, `subscribers.confirm_token`, `comments.post_id`). |
| 4 | `packages/db/migrations/meta/_journal.json` | Drizzle migration journal. |
| 5 | `packages/db/src/client.ts` | Singleton client per PAD §3.3 Pattern 2. WAL mode, foreign keys on, globalThis guard for dev hot-reload. |
| 6 | `packages/db/src/queries.ts` | Reusable query functions: `getRecentPosts(limit)`, `getPostBySlug(slug)`, `getArchivePosts(page, pageSize)`, `getSubscriberByEmail(email)`, `getSubscriberByToken(token)`, `getPendingComments()`, `getSiteSettings()`. Each is a thin Drizzle wrapper returning typed results. |
| 7 | `packages/db/src/seed.ts` | Inserts: 1 author user (password: `password`, role: `author`), 3 published posts (the mockup cards 01-03, with full MDX body), 6 archived posts (the mockup archive items, with excerpts only), 5 snippets (the typewriter hook + usage example + 3 more), 8 tags, site_settings row. Idempotent: checks if data exists before inserting. |
| 8 | `packages/db/src/index.ts` | Re-exports `./client`, `./schema`, `./queries`. |
| 9 | `packages/db/src/schema.test.ts` | Tests: insert a user, insert a post authored by that user, query it back; insert a subscriber with duplicate email → expects unique constraint error; insert a comment with non-existent post_id → expects FK error. |
| 10 | `packages/db/src/seed.test.ts` | Tests: run seed against in-memory `:memory:` DB → assert 3 published posts, 6 archived posts, 5 snippets, 1 author. Re-run seed → assert no duplicates (idempotent). |
| 11 | `packages/db/src/queries.test.ts` | Tests: `getRecentPosts(3)` returns 3 published posts sorted by `publishedAt DESC`; `getPostBySlug('on-the-quiet-violence-of-implicit-conversions')` returns the post; `getPostBySlug('nonexistent')` returns undefined; `getSubscriberByEmail('test@example.com')` returns the seeded subscriber. |
| 12 | `packages/auth/src/auth.ts` | Better Auth instance. `betterAuth({ database: drizzleAdapter(db, { provider: 'sqlite', schema }), emailAndPassword: { enabled: true }, plugins: [rbac({ roles: ['author', 'subscriber'] })], session: { cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 } } })`. |
| 13 | `packages/auth/src/client.ts` | `createAuthClient()` for client components. Exports `signIn`, `signOut`, `signUp`. |
| 14 | `packages/auth/src/rbac.ts` | Helper: `requireRole(session, role)` — throws `new Error('forbidden')` if `session.user.role !== role`. |
| 15 | `packages/auth/src/index.ts` | Re-exports `./auth`, `./client`, `./rbac`. |
| 16 | `packages/auth/src/auth.test.ts` | Tests: `signUp` with valid email/password creates a user; `signIn` returns a session; `requireRole` throws for wrong role. (Uses in-memory DB.) |
| 17 | `packages/types/src/post.ts` | `PostSchema`, `PostInputSchema` per PAD §4.4. Exports `slugify(title)`, `calculateReadTime(contentMdx)`. |
| 18 | `packages/types/src/subscriber.ts` | `SubscriberSchema`, `SubscribeSchema` (input). |
| 19 | `packages/types/src/comment.ts` | `CommentSchema`, `CommentInputSchema`. |
| 20 | `packages/types/src/user.ts` | `UserSchema`, `UserRoles = ['author', 'subscriber'] as const`. |
| 21 | `packages/types/src/env.ts` | Zod schema for env vars. Exports `env` (parsed + validated). |
| 22 | `packages/types/src/index.ts` | Re-exports. |
| 23 | `packages/types/src/post.test.ts` | Tests: `slugify('On the Quiet Violence of Implicit Conversions')` → `on-the-quiet-violence-of-implicit-conversions`; `calculateReadTime('word '.repeat(400))` → `2` (200 wpm). |
| 24 | `apps/web/src/lib/db.ts` | Re-export `db` from `@devlog/db` so feature code can do `import { db } from '@/lib/db'`. |
| 25 | `apps/web/src/lib/auth.ts` | Re-export `auth` from `@devlog/auth`. |
| 26 | `apps/web/src/lib/env.ts` | Re-export `env` from `@devlog/types/env`. |
| 27 | `apps/web/src/lib/rate-limit.ts` | In-memory sliding-window rate limiter. `rateLimit(key, max, windowSeconds): Promise<boolean>`. Uses a `Map<key, number[]>` of timestamps. Prunes entries older than `windowSeconds`. |
| 28 | `apps/web/src/lib/rate-limit.test.ts` | Tests: 3 calls within 1 hour → allowed; 4th call → denied; after window elapses (use fake timers) → allowed again. |
| 29 | `apps/web/src/domain/signed-token.ts` | `generateSignedToken(payload)` and `verifySignedToken(token)`. HMAC-SHA256, key from `env.SIGNED_TOKEN_SECRET`. Payload is JSON with `exp` (30 days). |
| 30 | `apps/web/src/domain/signed-token.test.ts` | Tests: round-trip token; tampered token → rejected; expired token → rejected. |

### Phase 2 TDD Checklist

- [ ] **RED 2.1:** `schema.test.ts` — write tests asserting that you can insert a user and a post authored by them, then query the post back with `authorId` populated.
- [ ] **GREEN 2.1:** Create `schema.ts` with users, posts, postsToTags, tags tables. Apply migration. Run test → passes.
- [ ] **REFACTOR 2.1:** Add indexes (`posts.slug`, `posts.status_published_at`). Re-run test → still passes.

- [ ] **RED 2.2:** `schema.test.ts` — write test asserting that inserting a subscriber with duplicate email throws, and that inserting a comment with non-existent `post_id` throws (FK violation).
- [ ] **GREEN 2.2:** Add `subscribers`, `comments`, `site_settings` to `schema.ts`. Regenerate migration.
- [ ] **REFACTOR 2.2:** No refactor.

- [ ] **RED 2.3:** `seed.test.ts` — write test asserting that after running seed, the DB has 3 published posts, 6 archived posts, 5 snippets, 1 author, 8 tags, 1 site_settings row.
- [ ] **GREEN 2.3:** Create `seed.ts` with the mockup data. Run test → passes.
- [ ] **REFACTOR 2.3:** Add idempotency check (`if (await getSiteSettings()) return;`).

- [ ] **RED 2.4:** `queries.test.ts` — write tests for `getRecentPosts`, `getPostBySlug`, `getSubscriberByEmail`.
- [ ] **GREEN 2.4:** Implement `queries.ts`. Run tests → pass.
- [ ] **REFACTOR 2.4:** Add `getArchivePosts` with pagination, `getPendingComments`.

- [ ] **RED 2.5:** `auth.test.ts` — write tests for `signUp`, `signIn`, `requireRole`.
- [ ] **GREEN 2.5:** Create `auth.ts` with Better Auth config + RBAC plugin. Run tests → pass.
- [ ] **REFACTOR 2.5:** Add `client.ts` for client components.

- [ ] **RED 2.6:** `signed-token.test.ts` — write tests for round-trip, tamper detection, expiry.
- [ ] **GREEN 2.6:** Implement `signed-token.ts` with HMAC.
- [ ] **REFACTOR 2.6:** Add `maskEmail` helper used by logger.

- [ ] **RED 2.7:** `rate-limit.test.ts` — write tests for allow/deny and window expiry.
- [ ] **GREEN 2.7:** Implement `rate-limit.ts`.
- [ ] **REFACTOR 2.7:** No refactor.

### Phase 2 Acceptance Gate

- [ ] `pnpm db:generate` produces `0000_initial.sql` with all tables.
- [ ] `pnpm db:migrate` applies cleanly. `apps/web/devlog.db` exists.
- [ ] `pnpm db:seed` populates the DB. Re-running it does not duplicate.
- [ ] `pnpm db:studio` opens Drizzle Studio and shows all tables with seeded data.
- [ ] All tests in `packages/db`, `packages/auth`, `packages/types`, `apps/web/src/domain`, `apps/web/src/lib/rate-limit` pass.
- [ ] `pnpm check-types` green.
- [ ] `pnpm lint` green.
- [ ] Commit 1: `feat(db): add drizzle schema, migrations, and queries (FR-21, FR-40, FR-42)`.
- [ ] Commit 2: `feat(db): seed mockup posts, archive items, snippets, and author user`.
- [ ] Commit 3: `feat(auth): add better-auth instance with email/password + RBAC (FR-33)`.

---

## 4. Phase 3 — Core UI Primitives & Theme System

### Goal

Stand up the design system. Tailwind v4 `@theme` block in `globals.css` defines all semantic tokens (color, font, radius) for the three themes. The custom CSS classes from the mockup (`.btn-primary`, `.btn-secondary`, `.article-card`, `.code-window`, `.copy-btn`, `.tag`, `.stat-pill`, `.hover-link`, `.theme-toggle`, `.input-field`, `.archive-item`, `.reveal`, `.bg-grid`, `.float-dot`, `.mouse-glow`, `.marquee`, `.progress-bar`, `.cursor`, `.logo-cursor`, `.tk-*`) are ported verbatim. The shadcn primitives we need (`button`, `input`, `dialog`, `dropdown-menu`, `command`, `toast`/`sonner`) are added and customized to match. Fonts (Fraunces, JetBrains Mono, Space Grotesk) are self-hosted via `next/font/local`.

### Files to Create / Update

| # | Path | Purpose & Features |
|---|------|--------------------|
| 1 | `apps/web/public/fonts/fraunces/subset.woff2` | Self-hosted Fraunces font (subsetted to Latin + symbols, weights 400/400i/700/900). Source: Google Fonts, downloaded via `pnpm dlx fonttools subset`. |
| 2 | `apps/web/public/fonts/jetbrains-mono/subset.woff2` | JetBrains Mono (400/500/700). |
| 3 | `apps/web/public/fonts/space-grotesk/subset.woff2` | Space Grotesk (300-700). |
| 4 | `apps/web/src/app/layout.tsx` (UPDATE) | Wire up the three `next/font/local` calls. Set `<html lang="en" data-theme={initialTheme} suppressHydrationWarning>`. Add inline `<script>` for cookie sync (PAD §3.3 Pattern 1). Export `metadata` with title `/dev/log — Notes from a Programmer's Desk`, description, OpenGraph. |
| 5 | `apps/web/src/app/globals.css` (UPDATE) | The big one. Tailwind v4 `@theme` block defines all semantic color tokens + `--font-display`, `--font-mono`, `--font-body`, `--radius`. Three `:root[data-theme="..."]` blocks (dark, light, cyber) define raw values per mockup lines 14-68. Then `@layer components` defines every custom class from the mockup lines 70-578 verbatim. `@media (prefers-reduced-motion: reduce)` zeroes animations at the end. |
| 6 | `apps/web/src/components/ui/button.tsx` | shadcn button, customized: sharp corners (`rounded-none` → `var(--radius)`), monospace font, microcaps label, primary/secondary variants matching `.btn-primary` / `.btn-secondary`. |
| 7 | `apps/web/src/components/ui/input.tsx` | shadcn input, customized to match `.input-field`. |
| 8 | `apps/web/src/components/ui/dialog.tsx` | shadcn dialog (Radix UI wrapper). Used by mobile nav drawer (Phase 4) and admin confirm modals (Phase 6). |
| 9 | `apps/web/src/components/ui/dropdown-menu.tsx` | shadcn dropdown-menu. Used by admin row actions. |
| 10 | `apps/web/src/components/ui/command.tsx` | shadcn command (cmdk). Used by admin quick-switcher (Phase 6). |
| 11 | `apps/web/src/components/ui/sonner.tsx` | Sonner toaster. Mounted in root layout. Used by subscribe success toast (Phase 4) and copy confirmation (Phase 4). |
| 12 | `apps/web/src/components/code-window.tsx` | The `.code-window` pattern. Props: `title: string` (filename), `code: string` (raw source), `language: string` (for Shiki). Renders the macOS traffic-light dots, the title, the `<CopyButton>`, and the Shiki-highlighted code. |
| 13 | `apps/web/src/components/copy-button.tsx` | The `.copy-btn` pattern. Props: `target: string` (the code text to copy). Uses `useCopyToClipboard` hook. Visual feedback per FR-10. |
| 14 | `apps/web/src/components/tag.tsx` | The `.tag` pill. Props: `children: string` (the tag text). |
| 15 | `apps/web/src/components/hover-link.tsx` | The `.hover-link` underline-on-hover. Renders `<a className="hover-link" href={href}>{children}</a>`. |
| 16 | `apps/web/src/components/skip-link.tsx` | Accessibility skip-to-content. First focusable element in `<body>`. |
| 17 | `apps/web/src/components/code-window.test.tsx` | Renders `<CodeWindow title="test.ts" code="const x = 1;" language="ts" />`. Asserts: title visible, code visible, copy button visible. Clicks copy → asserts clipboard write was called. |
| 18 | `apps/web/src/components/copy-button.test.tsx` | Renders `<CopyButton target="hello" />`. Clicks → asserts `navigator.clipboard.writeText` was called with `'hello'`. Asserts label swaps to `copied` then reverts after 1800ms (fake timers). |
| 19 | `apps/web/src/components/tag.test.tsx` | Renders `<Tag>JavaScript</Tag>`. Asserts text `JavaScript` is visible. |
| 20 | `apps/web/src/stores/theme-store.ts` | Zustand store for theme state. `{ theme, setTheme }`. Reads initial theme from `document.documentElement.dataset.theme`. On `setTheme`, updates `document.documentElement.setAttribute('data-theme', theme)` and writes `localStorage['devlog-theme'] = theme` and `document.cookie = 'devlog-theme=...;path=/;max-age=31536000;samesite=lax'`. |
| 21 | `apps/web/src/stores/ui-store.ts` | Zustand store for UI state. `{ mobileNavOpen, setMobileNavOpen, subscribeToast, setSubscribeToast }`. |
| 22 | `apps/web/src/hooks/use-typewriter.ts` | The typewriter hook (FR-6). Pure logic, no JSX. Respects `prefers-reduced-motion` (returns the first word statically). |
| 23 | `apps/web/src/hooks/use-theme.ts` | The theme hook (FR-4). Wraps `themeStore`, adds the `'T'` keyboard shortcut (FR-14), adds the `.theme-anim` body class toggle. |
| 24 | `apps/web/src/hooks/use-scroll-progress.ts` | The reading progress hook (FR-1). Returns 0-100 based on `scrollY / (scrollHeight - innerHeight)`. |
| 25 | `apps/web/src/hooks/use-reveal.ts` | IntersectionObserver-based reveal (FR-15). Returns a ref to attach to elements. Toggles `.visible` class. |
| 26 | `apps/web/src/hooks/use-copy-to-clipboard.ts` | Clipboard hook (FR-10). Returns `[copied, copy]`. `copy(text)` uses `navigator.clipboard.writeText` with `document.execCommand('copy')` fallback. Sets `copied=true` for 1800ms. |
| 27 | `apps/web/src/hooks/use-mouse-glow.ts` | Mouse glow hook (FR-5). Returns `[ref, position, visible]`. Updates position on `mousemove`, hides on `mouseleave`. |
| 28 | `apps/web/src/hooks/use-keyboard-shortcut.ts` | Generic keyboard shortcut hook. Args: `key: string`, `handler: () => void`, `deps: unknown[]`. Ignores inputs/textareas. Used by `use-theme` for `'T'`. |
| 29 | `apps/web/src/hooks/use-github-stats.ts` | Fetches `/api/github-stats` (FR-3). Returns `{ stars, forks, loading }`. Includes the simulated +1 every 9s. |
| 30 | `apps/web/src/hooks/use-typewriter.test.ts` | TDD test: cycles greetings, respects reduced motion, pauses on hidden tab. |
| 31 | `apps/web/src/hooks/use-theme.test.ts` | TDD test: cycles dark → light → cyber, persists to localStorage + cookie. |
| 32 | `apps/web/src/hooks/use-scroll-progress.test.ts` | TDD test: 0 at top, 100 at bottom, midpoint at half-scroll. |
| 33 | `apps/web/src/hooks/use-reveal.test.ts` | TDD test: toggles `.visible` when IntersectionObserver fires. |
| 34 | `apps/web/src/hooks/use-copy-to-clipboard.test.ts` | TDD test: writes to clipboard, falls back to execCommand, resets after 1800ms. |
| 35 | `apps/web/src/hooks/use-keyboard-shortcut.test.ts` | TDD test: fires handler on keypress, ignores when input focused. |
| 36 | `apps/web/src/hooks/use-github-stats.test.ts` | TDD test: fetches, falls back on 4xx, simulates +1 every 9s. |
| 37 | `apps/web/src/domain/github.ts` | `formatNumber(n)` (mockup lines 1148-1152), `GitHubRepoStats` type, `FALLBACK_STARS`, `FALLBACK_FORKS`. |
| 38 | `apps/web/src/domain/github.test.ts` | Tests: `formatNumber(82400) === '82.4k'`, `formatNumber(1000000) === '1.0M'`, `formatNumber(42) === '42'`. |
| 39 | `apps/web/src/domain/theme.ts` | `Theme = 'dark' \| 'light' \| 'cyber'`, `THEME_ORDER = ['dark', 'light', 'cyber']`, `THEME_COOKIE = 'devlog-theme'`, `isValidTheme(value)` typeguard. |
| 40 | `apps/web/src/domain/theme.test.ts` | Tests: `isValidTheme('dark') === true`, `isValidTheme('neon') === false`. |

### Phase 3 TDD Checklist

For each hook: write the test first, watch it fail, implement, watch it pass, refactor.

- [ ] **RED 3.1:** `use-typewriter.test.ts` — tests cycles, reduced-motion, hidden-tab.
- [ ] **GREEN 3.1:** Implement `use-typewriter.ts` with `useEffect` + `setTimeout` + Page Visibility.
- [ ] **REFACTOR 3.1:** Extract the `greetings` array constant.

- [ ] **RED 3.2:** `use-theme.test.ts` — tests cycling, persistence.
- [ ] **GREEN 3.2:** Implement `use-theme.ts` with Zustand store.
- [ ] **REFACTOR 3.2:** Extract `setCookie` helper.

- [ ] **RED 3.3:** `use-scroll-progress.test.ts` — tests 0/100/midpoint.
- [ ] **GREEN 3.3:** Implement with `scroll` listener + `requestAnimationFrame` throttle.
- [ ] **REFACTOR 3.3:** No refactor.

- [ ] **RED 3.4:** `use-reveal.test.ts` — mock IntersectionObserver, test toggling.
- [ ] **GREEN 3.4:** Implement with `useRef` + `IntersectionObserver` (polyfilled in jsdom setup).
- [ ] **REFACTOR 3.4:** Support `unobserve` after reveal.

- [ ] **RED 3.5:** `use-copy-to-clipboard.test.ts` — mock clipboard.
- [ ] **GREEN 3.5:** Implement with `navigator.clipboard.writeText` + textarea fallback.
- [ ] **REFACTOR 3.5:** Extract `useCopyToClipboard` from `<CopyButton>`.

- [ ] **RED 3.6:** `use-keyboard-shortcut.test.ts` — test firing, input-focus ignoring.
- [ ] **GREEN 3.6:** Implement with `keydown` listener.
- [ ] **REFACTOR 3.6:** Reuse in `use-theme` for `'T'`.

- [ ] **RED 3.7:** `use-github-stats.test.ts` — test fetch, fallback, +1 simulation.
- [ ] **GREEN 3.7:** Implement with `fetch` + `setInterval`.
- [ ] **REFACTOR 3.7:** Move `formatNumber`, `FALLBACK_*` to `domain/github.ts`.

- [ ] **RED 3.8:** `code-window.test.tsx`, `copy-button.test.tsx`, `tag.test.tsx`.
- [ ] **GREEN 3.8:** Implement the three components.
- [ ] **REFACTOR 3.8:** No refactor.

### Phase 3 Acceptance Gate

- [ ] `apps/web/src/app/globals.css` contains all tokens and component classes from the mockup lines 14-578.
- [ ] `apps/web/src/app/layout.tsx` loads the three fonts, sets the theme cookie, exports metadata.
- [ ] Every hook has a passing test.
- [ ] Every custom component (`CodeWindow`, `CopyButton`, `Tag`, `HoverLink`, `SkipLink`) has a passing render test.
- [ ] shadcn primitives are added and customized.
- [ ] `pnpm check-types` green.
- [ ] `pnpm lint` green.
- [ ] `pnpm test` green; coverage ≥ 80% on the new files.
- [ ] Commit 1: `feat(ui): add Tailwind v4 @theme block + all custom component CSS`.
- [ ] Commit 2: `feat(ui): add self-hosted Fraunces, JetBrains Mono, Space Grotesk fonts`.
- [ ] Commit 3: `feat(ui): add hooks (typewriter, theme, scroll-progress, reveal, copy, shortcut, github-stats)`.
- [ ] Commit 4: `feat(ui): add shadcn primitives (button, input, dialog, dropdown, command, sonner)`.

---

## 5. Phase 4 — Dynamic Landing Page (TDD, Mockup-Faithful)

### Goal

Build the landing page (`apps/web/src/app/(public)/page.tsx`) that, when rendered at 375px / 768px / 1280px in `dark`, `light`, `cyber` themes, is indistinguishable from `landing_page_mockup.html`. Each mockup section becomes a React component. All interactivity (typewriter, theme toggle, GitHub pill, copy button, scroll reveal, mouse glow, progress bar, marquee, subscribe form) works. Subscribe form posts to a real Server Action that inserts a pending subscriber and sends a Resend confirmation email.

### Files to Create

| # | Path | Purpose & Features |
|---|------|--------------------|
| 1 | `apps/web/src/app/(public)/layout.tsx` | Public layout. Renders `<Nav>`, `<main>{children}</main>`, `<Footer>`. Mounts `<Toaster />` (sonner). |
| 2 | `apps/web/src/app/(public)/page.tsx` | Landing page. Composes: `<Hero>`, `<Marquee>`, `<RecentNotes>`, `<SnippetShowcase>`, `<ArchivePreview>`, `<SubscribeSection>`. Each is a server component that fetches its own data via `@/lib/db` queries (or `@/lib/github` for stats). |
| 3 | `apps/web/src/features/landing/nav.tsx` | The fixed navigation header (FR-2). Renders the logotype, the center nav links, the GitHub pill, the theme toggle. Uses `useTheme` for toggle. Server component fetches initial GitHub stats (passes to client `<GitHubPill>`); the client component then polls `/api/github-stats` for live updates. |
| 4 | `apps/web/src/features/landing/progress-bar.tsx` | The reading progress bar (FR-1). Client component, uses `useScrollProgress`. |
| 5 | `apps/web/src/features/landing/hero.tsx` | The hero section (FR-5). Server component renders the static parts (issue meta, subtitle, CTAs, stats grid, scroll cue). Client component `<HeroTypewriter>` uses `useTypewriter` to render the typing greeting. Client component `<HeroMouseGlow>` uses `useMouseGlow`. |
| 6 | `apps/web/src/features/landing/hero-typewriter.tsx` | Client component wrapping `useTypewriter`. Renders `<span id="typewriter" className="cursor">{text}</span>`. |
| 7 | `apps/web/src/features/landing/hero-mouse-glow.tsx` | Client component wrapping `useMouseGlow`. Renders `<div className="mouse-glow" style={{ left, top, opacity }} />`. |
| 8 | `apps/web/src/features/landing/marquee.tsx` | The technology marquee (FR-7). Pure CSS animation; no JS. Server component. |
| 9 | `apps/web/src/features/landing/recent-notes.tsx` | The 3 article cards (FR-8). Server component fetches `getRecentPosts(3)`. If DB is empty, falls back to the 3 mockup cards (FR-8 acceptance). |
| 10 | `apps/web/src/features/landing/article-card.tsx` | The `.article-card` (FR-8 component). Props: `index: number` (1-3), `tag: string`, `date: string`, `readTime: string`, `title: string`, `excerpt: ReactNode`, `slug: string`. Wraps in `<Link href="/posts/{slug}">`. |
| 11 | `apps/web/src/features/landing/snippet-showcase.tsx` | The snippet of the week section (FR-9). Server component reads the latest snippet from `content/snippets/`. Renders two `<CodeWindow>` instances. |
| 12 | `apps/web/src/features/landing/archive-preview.tsx` | The archive preview section (FR-11). Server component fetches 6 most recent posts. |
| 13 | `apps/web/src/features/landing/archive-item.tsx` | The `.archive-item` row. Props: `date, title, excerpt, tag, readTime, slug`. |
| 14 | `apps/web/src/features/landing/subscribe-section.tsx` | The subscribe section (FR-12). Client component (has form state). Renders the email input + button. On submit, calls the `subscribeToNewsletter` Server Action. Shows the `<SubscribeToast>` on success. |
| 15 | `apps/web/src/features/landing/subscribe-toast.tsx` | The `#subToast` (FR-12). Renders the success message with the `.opacity-0 → opacity-1` transition. |
| 16 | `apps/web/src/features/landing/github-pill.tsx` | Client component (FR-3). Receives initial `stars` and `forks` from server. Uses `useGitHubStats` to poll for updates + simulate +1. |
| 17 | `apps/web/src/features/landing/theme-toggle.tsx` | The 3-button theme toggle (FR-4). Client component. Uses `useTheme`. Renders `.theme-toggle > 3× .theme-btn`. |
| 18 | `apps/web/src/features/landing/footer.tsx` | The footer (FR-13). Server component. Pulls `NEXT_PUBLIC_AUTHOR_EMAIL` from env. |
| 19 | `apps/web/src/features/subscribe/actions.ts` | Server Action `subscribeToNewsletter(input: { email, ip })`. Per PAD §3.3 Pattern 3: Zod parse, rate limit, idempotency, send confirmation email, return `{ ok, alreadySubscribed? }`. |
| 20 | `apps/web/src/features/subscribe/actions.test.ts` | Tests for `subscribeToNewsletter`: happy path, duplicate confirmed, invalid email, rate limit, Resend failure (mocked). |
| 21 | `apps/web/src/app/api/github-stats/route.ts` | `GET /api/github-stats`. Returns `{ stars, forks }`. Cached 60s via `unstable_cache` (PAD §3.3 Pattern 4). Falls back to `FALLBACK_STARS` / `FALLBACK_FORKS`. |
| 22 | `apps/web/src/app/api/github-stats/route.test.ts` | Test: 200 with body; 200 with fallback when GitHub API mocked to fail; cache hit returns previous value. |
| 23 | `apps/web/src/lib/github.ts` | `getGitHubStats(repo)` (PAD §3.3 Pattern 4). Uses `unstable_cache`. |
| 24 | `apps/web/src/features/landing/hero.test.tsx` | Render test: hero renders, typewriter starts (or static on reduced motion), stats grid shows 4 numbers, CTAs present. |
| 25 | `apps/web/src/features/landing/recent-notes.test.tsx` | Render test: with empty DB → falls back to 3 mockup cards; with seeded DB → renders 3 cards from DB. |
| 26 | `apps/web/src/features/landing/subscribe-section.test.tsx` | Render test: form submits, shows toast, handles error. Uses mocked Server Action. |
| 27 | `apps/web/src/features/landing/theme-toggle.test.tsx` | Render test: 3 buttons, click changes theme, keyboard `T` cycles. |
| 28 | `apps/web/src/features/landing/landing-page.test.tsx` | End-to-end render test of `<LandingPage>`: asserts all 8 sections present, no console errors. |

### Phase 4 TDD Checklist

For each landing section: write a failing render test first, then implement.

- [ ] **RED 4.1:** `nav.test.tsx` — renders nav, asserts logotype, asserts 4 nav links, asserts theme toggle, asserts GitHub pill (with mocked data).
- [ ] **GREEN 4.1:** Implement `nav.tsx`, `theme-toggle.tsx`, `github-pill.tsx`.
- [ ] **REFACTOR 4.1:** Extract `GitHubPill` into its own file.

- [ ] **RED 4.2:** `hero.test.tsx` — renders hero, asserts issue meta, asserts typewriter starts (with fake timers), asserts subtitle, asserts CTAs, asserts stats grid (4 numbers), asserts scroll cue.
- [ ] **GREEN 4.2:** Implement `hero.tsx`, `hero-typewriter.tsx`, `hero-mouse-glow.tsx`.
- [ ] **REFACTOR 4.2:** Extract typewriter greeting array constant.

- [ ] **RED 4.3:** `marquee.test.tsx` — renders marquee, asserts all 11 technologies present.
- [ ] **GREEN 4.3:** Implement `marquee.tsx`.
- [ ] **REFACTOR 4.3:** No refactor (pure CSS).

- [ ] **RED 4.4:** `recent-notes.test.tsx` — two test cases: empty DB → 3 mockup cards; seeded DB → 3 cards from DB.
- [ ] **GREEN 4.4:** Implement `recent-notes.tsx`, `article-card.tsx`.
- [ ] **REFACTOR 4.4:** Extract the mockup fallback data into a constant `MOCKUP_RECENT_NOTES`.

- [ ] **RED 4.5:** `snippet-showcase.test.tsx` — renders two `<CodeWindow>` instances.
- [ ] **GREEN 4.5:** Implement `snippet-showcase.tsx`.
- [ ] **REFACTOR 4.5:** No refactor.

- [ ] **RED 4.6:** `archive-preview.test.tsx` — empty DB → 6 mockup items; seeded DB → 6 items from DB.
- [ ] **GREEN 4.6:** Implement `archive-preview.tsx`, `archive-item.tsx`.
- [ ] **REFACTOR 4.6:** Extract mockup fallback `MOCKUP_ARCHIVE`.

- [ ] **RED 4.7:** `subscribe-section.test.tsx` — renders form, types email, clicks submit, asserts Server Action called, asserts toast shown, asserts input cleared and placeholder changed.
- [ ] **GREEN 4.7:** Implement `subscribe-section.tsx`, `subscribe-toast.tsx`, `actions.ts`.
- [ ] **REFACTOR 4.7:** No refactor.

- [ ] **RED 4.8:** `footer.test.tsx` — asserts copyright, asserts 4 social links, asserts `$ echo` line.
- [ ] **GREEN 4.8:** Implement `footer.tsx`.
- [ ] **REFACTOR 4.8:** No refactor.

- [ ] **RED 4.9:** `github-stats/route.test.ts` — 200 OK, fallback on failure, cache hit.
- [ ] **GREEN 4.9:** Implement `route.ts`, `lib/github.ts`.
- [ ] **REFACTOR 4.9:** No refactor.

### Phase 4 Acceptance Gate

- [ ] `pnpm dev` serves the landing page at `http://localhost:3000`.
- [ ] Visual comparison: open `landing_page_mockup.html` and `http://localhost:3000` side by side at 375px / 768px / 1280px in `dark`, `light`, `cyber` themes. No visible differences in layout, color, typography, or interaction.
- [ ] Lighthouse (desktop, dark theme): Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- [ ] LCP ≤ 1.2s on desktop, ≤ 2.0s on simulated 4G mobile.
- [ ] CLS ≤ 0.05.
- [ ] Theme toggle persists across reload (cookie).
- [ ] Typewriter cycles greetings, pauses on hidden tab.
- [ ] Copy button works (with and without `navigator.clipboard`).
- [ ] Subscribe form: valid email → success toast; invalid email → inline error; Resend failure → still shows success.
- [ ] GitHub pill shows plausible numbers immediately, increments every 9s.
- [ ] Scroll reveal fires on IntersectionObserver.
- [ ] Progress bar reaches 100% at end of page.
- [ ] Keyboard `T` cycles theme.
- [ ] `prefers-reduced-motion` disables all animations.
- [ ] Commit 1: `feat(landing): add nav, theme toggle, GitHub pill, progress bar (FR-1, FR-2, FR-3, FR-4)`.
- [ ] Commit 2: `feat(landing): add hero section with typewriter, stats grid, mouse glow (FR-5, FR-6, FR-16)`.
- [ ] Commit 3: `feat(landing): add marquee, recent notes, snippet showcase, archive preview (FR-7, FR-8, FR-9, FR-11)`.
- [ ] Commit 4: `feat(landing): add subscribe section + Server Action (FR-12, FR-30)`.
- [ ] Commit 5: `feat(landing): add footer + SkipLink (FR-13, a11y)`.
- [ ] Commit 6: `feat(landing): add /api/github-stats cached endpoint (FR-3 backend)`.

---

## 6. Phase 5 — Blog Surface (Archive, Posts, Snippets, RSS, Sitemap)

### Goal

Build the public blog surface: `/archive` (paginated, tag-filtered), `/posts/[slug]` (MDX-rendered), `/snippets` (list and detail), `/rss.xml`, `/sitemap.xml`, `/robots.txt`. All routes return 200 with seeded data and gracefully degrade with empty DB.

### Files to Create

| # | Path | Purpose & Features |
|---|------|--------------------|
| 1 | `apps/web/src/app/(public)/archive/page.tsx` | `/archive` (FR-20). Server component. Reads `?page`, `?tag`, `?q` from `searchParams` (Next.js 16: `searchParams: Promise<{...}>`). Fetches paginated posts via `getArchivePosts(page, pageSize, tagFilter, searchQuery)`. Renders `<ArchiveList>` + `<Pagination>`. |
| 2 | `apps/web/src/app/(public)/archive/page/[page]/page.tsx` | `/archive/page/2` (alternative URL for SEO). Same logic as `/archive` with `page` from params. |
| 3 | `apps/web/src/app/(public)/archive/page.test.tsx` | Render test: empty DB → empty state; seeded DB → 6 posts on page 1, pagination shows page 2 link. |
| 4 | `apps/web/src/features/blog/archive-list.tsx` | The list of `<ArchiveItem>` rows. Props: `posts: Post[]`. |
| 5 | `apps/web/src/features/blog/pagination.tsx` | Prev / Page N / Next. Uses `<Link>` for crawlability. Hides Prev on page 1, hides Next on last page. |
| 6 | `apps/web/src/features/blog/tag-filter.tsx` | A `<select>` that submits on change (with `<noscript>` submit button). Lists all tags from `getTags()`. |
| 7 | `apps/web/src/app/(public)/posts/[slug]/page.tsx` | `/posts/[slug]` (FR-21). Server component. `params: Promise<{ slug: string }>`. Validates slug regex. Fetches `getPostBySlug(slug)`. If not found, calls `notFound()` (renders `not-found.tsx`). Renders MDX via `renderMDX(post.contentMdx)` (PAD §3.3 Pattern 5). Exports `generateMetadata` for SEO. Exports `generateStaticParams` for top-50 posts at build time. |
| 8 | `apps/web/src/app/(public)/posts/[slug]/page.test.tsx` | Render test: existing post → 200, MDX rendered, title/excerpt/tags/reading-time present; non-existent slug → 404. |
| 9 | `apps/web/src/features/blog/post-page.tsx` | Renders the post: top meta, MDX content, author bio, subscribe CTA, prev/next links. |
| 10 | `apps/web/src/features/blog/mdx-components.tsx` | MDX component map. Maps `pre` → `<CodeWindow>`, `a` → custom `<Link>` with hover effect, `img` → `<Image>` (next/image), `h2`/`h3` → auto-anchored headings. |
| 11 | `apps/web/src/features/blog/comment-form.tsx` | Client component for leaving a comment (FR-60). Calls `createComment` Server Action. |
| 12 | `apps/web/src/features/blog/comment-list.tsx` | Renders nested comments (one level of nesting). |
| 13 | `apps/web/src/features/blog/actions.ts` | Server Action `createComment({ postId, body, parentId? })`. Requires subscriber session. Rate-limited. |
| 14 | `apps/web/src/features/blog/actions.test.ts` | Tests for `createComment`: happy path, no session, rate limit, invalid input. |
| 15 | `apps/web/src/app/(public)/snippets/page.tsx` | `/snippets` (FR-22). Server component. Lists all snippets in `content/snippets/` (read via `fs.readdir`). |
| 16 | `apps/web/src/app/(public)/snippets/[slug]/page.tsx` | `/snippets/[slug]`. Renders a single snippet as a `<CodeWindow>`. |
| 17 | `apps/web/src/app/api/rss.xml/route.ts` | `GET /rss.xml` (FR-23). Returns `Content-Type: application/rss+xml; charset=utf-8`. Body is RSS 2.0 XML of 20 most recent posts. |
| 18 | `apps/web/src/app/api/rss.xml/route.test.ts` | Tests: returns 200, has `<rss>` root, has `<channel>`, has `<item>` per post, valid XML. |
| 19 | `apps/web/src/app/api/sitemap.xml/route.ts` | `GET /sitemap.xml` (FR-24). Returns XML sitemap of all published posts + landing + archive. |
| 20 | `apps/web/src/app/api/robots.txt/route.ts` | `GET /robots.txt` (FR-24). Returns `User-agent: *\nAllow: /\nSitemap: {siteUrl}/sitemap.xml`. |
| 21 | `apps/web/src/app/not-found.tsx` | 404 page. Branded: `$ command not found: <url>`. |
| 22 | `apps/web/src/app/error.tsx` | 500 page. Branded: `$ segmentation fault (core dumped)`. Client component (so it catches runtime errors). |
| 23 | `apps/web/content/posts/*.mdx` | Three MDX files for the mockup recent notes (full body content). |
| 24 | `apps/web/content/snippets/*.mdx` | Five MDX files for the snippets (typewriter, usage, + 3 more). |

### Phase 5 TDD Checklist

- [ ] **RED 5.1:** `archive/page.test.tsx` — empty DB → empty state; seeded DB → 6 items + pagination.
- [ ] **GREEN 5.1:** Implement `archive/page.tsx`, `archive-list.tsx`, `pagination.tsx`, `tag-filter.tsx`.
- [ ] **REFACTOR 5.1:** Extract pagination logic into `lib/pagination.ts`.

- [ ] **RED 5.2:** `posts/[slug]/page.test.tsx` — existing slug → 200, MDX content; non-existent → 404.
- [ ] **GREEN 5.2:** Implement `posts/[slug]/page.tsx`, `post-page.tsx`, `mdx-components.tsx`, `lib/mdx.ts`.
- [ ] **REFACTOR 5.2:** Add `generateStaticParams` for top-50 posts.

- [ ] **RED 5.3:** `snippets/page.test.tsx` — renders list of 5 snippets.
- [ ] **GREEN 5.3:** Implement `snippets/page.tsx` and `snippets/[slug]/page.tsx`.
- [ ] **REFACTOR 5.3:** No refactor.

- [ ] **RED 5.4:** `rss.xml/route.test.ts` — 200 + valid XML.
- [ ] **GREEN 5.4:** Implement `rss.xml/route.ts`.
- [ ] **REFACTOR 5.4:** Use a shared `getPostRssItem(post)` helper.

- [ ] **RED 5.5:** `blog/actions.test.ts` — `createComment` happy path, no session, rate limit.
- [ ] **GREEN 5.5:** Implement `actions.ts`, `comment-form.tsx`, `comment-list.tsx`.
- [ ] **REFACTOR 5.5:** No refactor.

### Phase 5 Acceptance Gate

- [ ] `/archive` returns 200. Empty DB → empty state. Seeded DB → 6 posts + pagination.
- [ ] `/archive?tag=JavaScript` filters.
- [ ] `/archive?page=2` shows older posts.
- [ ] `/posts/on-the-quiet-violence-of-implicit-conversions` returns 200 with MDX rendered.
- [ ] `/posts/nonexistent` returns 404 with branded page.
- [ ] `/snippets` returns 200. Lists 5 snippets.
- [ ] `/snippets/use-typewriter` returns 200 with code window.
- [ ] `/rss.xml` returns valid RSS 2.0 XML.
- [ ] `/sitemap.xml` returns valid sitemap.
- [ ] `/robots.txt` returns valid robots.
- [ ] `pnpm check-types`, `pnpm lint`, `pnpm test` all green.
- [ ] Commit 1: `feat(blog): add /archive paginated + tag-filtered (FR-20)`.
- [ ] Commit 2: `feat(blog): add /posts/[slug] MDX-rendered (FR-21)`.
- [ ] Commit 3: `feat(blog): add /snippets list + detail (FR-22)`.
- [ ] Commit 4: `feat(blog): add /rss.xml, /sitemap.xml, /robots.txt, 404 + 500 pages (FR-23, FR-24)`.

---

## 7. Phase 6 — Auth, Admin, Email, Subscribers

### Goal

Build the admin surface and complete the email flow. Better Auth login at `/admin/login`. All `/admin/*` routes gated. Dashboard with stats. Post editor (MDX via CodeMirror 6). Subscriber list with CSV export. Comment moderation. Site settings. Resend email templates for subscribe confirmation and new-essay notification. Subscribe → confirm → email round-trips end-to-end.

### Files to Create

| # | Path | Purpose & Features |
|---|------|--------------------|
| 1 | `apps/web/proxy.ts` | Edge handler (Layer 0). Reads session cookie. For `/admin/*` (except `/admin/login`), if no session or role !== 'author', redirect to `/admin/login`. Sets security headers (CSP, X-Frame-Options, etc.). |
| 2 | `apps/web/src/app/(auth)/admin/layout.tsx` | Admin layout. Sidebar with: Dashboard, Posts, Subscribers, Comments, Settings, Sign out. Renders children. |
| 3 | `apps/web/src/app/(auth)/admin/page.tsx` | Dashboard (FR-40). Server component. Fetches: subscriber counts (pending/confirmed/unsubscribed), post counts (draft/published), comment counts (pending/approved/spam), GitHub stars (cached). Renders 4 stat cards. |
| 4 | `apps/web/src/app/(auth)/admin/login/page.tsx` | Login page (FR-33). Client component. Email + password form. Calls Better Auth `signIn`. On success, redirect to `/admin`. |
| 5 | `apps/web/src/app/(auth)/admin/posts/page.tsx` | Posts list (FR-41). Server component. Lists all posts (drafts first, then published). Each row: title, status, publishedAt, edit link, delete dropdown. |
| 6 | `apps/web/src/app/(auth)/admin/posts/new/page.tsx` | New post (FR-41). Renders `<PostEditor>`. |
| 7 | `apps/web/src/app/(auth)/admin/posts/[id]/page.tsx` | Edit post. Fetches post by ID, renders `<PostEditor post={post}>`. |
| 8 | `apps/web/src/features/admin/post-editor.tsx` | Client component. Form: title (input), slug (auto-derived, editable), excerpt (textarea), tags (multi-select), publishedAt (datetime-local or "Save as draft"), content (CodeMirror 6 with markdown+mdx language support). On submit, calls `createPost` or `updatePost` Server Action. |
| 9 | `apps/web/src/features/admin/post-list.tsx` | Table of posts with row actions. |
| 10 | `apps/web/src/features/admin/subscriber-list.tsx` | Table of subscribers with status filter, search, CSV export. |
| 11 | `apps/web/src/app/(auth)/admin/subscribers/page.tsx` | Server component fetches subscribers (paginated), renders `<SubscriberList>`. |
| 12 | `apps/web/src/app/(auth)/admin/subscribers/export/route.ts` | `GET /admin/subscribers/export`. Streams CSV. `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename=subscribers-YYYY-MM-DD.csv`. |
| 13 | `apps/web/src/features/admin/comment-moderation.tsx` | Comment moderation queue with Approve / Spam / Delete actions. |
| 14 | `apps/web/src/app/(auth)/admin/comments/page.tsx` | Server component fetches pending comments, renders `<CommentModeration>`. |
| 15 | `apps/web/src/features/admin/settings-form.tsx` | Site settings form (FR-44). |
| 16 | `apps/web/src/app/(auth)/admin/settings/page.tsx` | Renders `<SettingsForm>`. |
| 17 | `apps/web/src/features/admin/actions.ts` | Server Actions: `createPost`, `updatePost`, `deletePost`, `moderateComment` (approve/spam/delete), `updateSiteSettings`. All require `role: 'author'`. |
| 18 | `apps/web/src/features/admin/actions.test.ts` | Tests for each Server Action: happy path + authorization (non-author rejected). |
| 19 | `apps/web/src/features/auth/login-form.tsx` | Client component. Email + password + submit. Calls `signIn`. |
| 20 | `apps/web/src/features/auth/sign-out-button.tsx` | Client component. Calls `signOut`, redirects to `/admin/login`. |
| 21 | `apps/web/src/app/api/confirm/route.ts` | `GET /api/confirm?token=...` (FR-30). Verifies signed token. Looks up subscriber. Updates status to `confirmed`. Redirects to `/` with `?subscribed=1` query param (so the landing can show a "welcome" toast). |
| 22 | `apps/web/src/app/api/confirm/route.test.ts` | Tests: valid token → 302 + DB updated; expired token → 400; already confirmed → 200 "already subscribed"; unknown token → 400. |
| 23 | `apps/web/src/app/(public)/unsubscribe/page.tsx` | `/unsubscribe?token=...` (FR-31). Server component. Verifies token, updates status to `unsubscribed`, shows confirmation page. |
| 24 | `apps/web/src/app/(public)/preferences/page.tsx` | `/preferences?token=...` (FR-32). Subscriber can update email, frequency, or unsubscribe. |
| 25 | `packages/email/src/templates/confirm-email.tsx` | React Email template (FR-50). Monospace, dark theme. Greeting, "Confirm your subscription to /dev/log", button linking to `/api/confirm?token=...`, plain-text fallback, unsubscribe footer. |
| 26 | `packages/email/src/templates/new-essay-email.tsx` | React Email template (FR-51). Post title, excerpt, "Read on /dev/log" button. |
| 27 | `packages/email/src/templates/unsubscribe-confirmation.tsx` | React Email template sent when a subscriber unsubscribes. "You've been unsubscribed. Resubscribe any time." |
| 28 | `packages/email/src/send.ts` | `sendEmail(template, props)`. Wraps Resend. `from: env.RESEND_FROM`. `to`, `subject`, `html`, `text` derived from the template. Catches errors, logs, rethrows (caller decides whether to swallow). |
| 29 | `packages/email/src/send.test.ts` | Tests: `sendEmail` calls `resend.emails.send` with correct args; Resend 4xx throws. |
| 30 | `apps/web/src/lib/email.ts` | Re-export `sendEmail` from `@devlog/email`. |

### Phase 6 TDD Checklist

- [ ] **RED 6.1:** `confirm/route.test.ts` — valid token → 302 + DB updated; expired → 400.
- [ ] **GREEN 6.1:** Implement `confirm/route.ts`.
- [ ] **REFACTOR 6.1:** No refactor.

- [ ] **RED 6.2:** `send.test.ts` — `sendEmail('confirm-email', { to, token })` calls Resend with correct args.
- [ ] **GREEN 6.2:** Implement `send.ts`, `templates/confirm-email.tsx`.
- [ ] **REFACTOR 6.2:** Extract `renderEmail(template, props)` helper.

- [ ] **RED 6.3:** `admin/actions.test.ts` — `createPost` happy path + non-author rejection.
- [ ] **GREEN 6.3:** Implement `actions.ts`, `post-editor.tsx`, admin pages.
- [ ] **REFACTOR 6.3:** Extract MDX validation into a shared `validateMdx` helper.

- [ ] **RED 6.4:** `login-form.test.tsx` — types email/password, clicks submit, asserts `signIn` called, asserts redirect.
- [ ] **GREEN 6.4:** Implement `login-form.tsx`, `login/page.tsx`.
- [ ] **REFACTOR 6.4:** No refactor.

- [ ] **RED 6.5:** `subscriber-list.test.tsx` — renders list with status filter.
- [ ] **GREEN 6.5:** Implement `subscriber-list.tsx`, `subscribers/page.tsx`, `export/route.ts`.
- [ ] **REFACTOR 6.5:** No refactor.

### Phase 6 Acceptance Gate

- [ ] `/admin/login` shows the login form. Logging in with `author@devlog.example` / `password` redirects to `/admin`.
- [ ] `/admin` (without session) redirects to `/admin/login`.
- [ ] `/admin` dashboard shows the 4 stat cards.
- [ ] `/admin/posts` lists all posts. Click "New" → editor. Create a post → it appears in the list and at `/posts/[slug]`.
- [ ] `/admin/subscribers` lists subscribers. CSV export downloads a file.
- [ ] `/admin/comments` lists pending comments. Approve / spam / delete works.
- [ ] `/admin/settings` edits site settings. Save → changes reflected on next render.
- [ ] Subscribe flow: enter email on landing → see success toast → check Resend sandbox (or dev log) for confirmation email → click confirm link → status changes to `confirmed` → redirected to landing with "welcome" toast.
- [ ] Unsubscribe flow: click unsubscribe link in email → status changes to `unsubscribed` → see confirmation page.
- [ ] All tests pass; coverage ≥ 80%.
- [ ] Commit 1: `feat(auth): add proxy.ts with admin guard + login page (FR-33)`.
- [ ] Commit 2: `feat(admin): add dashboard, post editor, post list (FR-40, FR-41)`.
- [ ] Commit 3: `feat(admin): add subscriber list + CSV export (FR-42)`.
- [ ] Commit 4: `feat(admin): add comment moderation + site settings (FR-43, FR-44)`.
- [ ] Commit 5: `feat(email): add Resend integration + React Email templates + confirm/unsubscribe flows (FR-30, FR-31, FR-50, FR-51)`.

---

## 8. Phase 7 — Tests, Lint, Typecheck, Build, Lighthouse

### Goal

Close coverage gaps. Run all gates. Verify Lighthouse scores. Fix any issues found. The repo is now production-ready.

### Tasks

| # | Task | Acceptance |
|---|------|------------|
| 1 | Run `pnpm test:coverage`. Identify any file below 80% statements / 75% branches. Write tests to close the gap. | All files ≥ 80% / 75%. |
| 2 | Run `pnpm check-types`. Fix any errors. | 0 errors. |
| 3 | Run `pnpm lint`. Fix any errors. Warnings reviewed and either fixed or justified in a comment. | 0 errors. |
| 4 | Run `pnpm build`. Verify the standalone output exists at `apps/web/.next/standalone/`. | Build succeeds. |
| 5 | Run `pnpm audit --prod`. Identify any critical vulnerabilities. Upgrade or pin. | 0 critical. |
| 6 | Run Lighthouse (Chrome DevTools or `pnpm dlx lighthouse http://localhost:3000 --only-categories=performance,accessibility,best-practices,seo`). | All four categories ≥ 95. |
| 7 | Manually walk the mockup-comparison: open `landing_page_mockup.html` and `http://localhost:3000` side-by-side at 375/768/1280 in dark/light/cyber. | No visible differences. |
| 8 | Walk through every FR (1-16, 20-24, 30-33, 40-44, 50-51). Mark each as ✅ in the PRD checklist. | All FRs implemented. |
| 9 | Verify the MEP's every phase checklist is fully checked. | All checked. |
| 10 | Update `README.md` with the final setup commands and link to PRD/PAD/MEP. | README updated. |

### Phase 7 Acceptance Gate

- [ ] All gates green: `check-types`, `lint`, `test`, `build`, `audit`.
- [ ] Lighthouse ≥ 95 across all four categories (desktop, dark theme).
- [ ] Visual mockup comparison: no differences at 375/768/1280 in dark/light/cyber.
- [ ] PRD checklist fully checked.
- [ ] Commit 1: `test: close coverage gaps to ≥80% statements across all packages`.
- [ ] Commit 2: `chore: final pre-push cleanup + README update`.

---

## 9. Phase 8 — Validation & Git Push

### Goal

Validate the entire plan against the PRD and PAD. Commit any final changes. Push to GitHub via the SSH wrapper.

### Tasks

- [ ] **Validate MEP against PRD:** for each FR in the PRD (FR-1 through FR-51), confirm the implementing phase is complete and a test exists. Cross-reference in a validation table.
- [ ] **Validate MEP against PAD:** for each ADR (ADR-001 through ADR-007), confirm the decision was implemented. Confirm the directory structure matches PAD §3.2. Confirm the layer model is enforced (no cross-layer imports).
- [ ] **Final commit:** `docs: add PRD, PAD, MEP` (or break into per-document commits if preferred).
- [ ] **SSH wrapper setup:**
  ```bash
  # 1. Copy the SSH key from docs/ssh-key.txt to ~/.ssh/id_github
  mkdir -p ~/.ssh
  cp docs/ssh-key.txt ~/.ssh/id_github
  chmod 600 ~/.ssh/id_github
  
  # 2. Make the wrapper executable
  chmod +x skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py
  
  # 3. Verify paramiko is installed
  python3 -c "import paramiko; print(paramiko.__version__)"
  # If missing: python3 -m pip install --break-system-packages paramiko
  
  # 4. Set remote to SSH (if currently HTTPS)
  git remote set-url origin git@github.com:nordeim/programmer-blog.git
  
  # 5. Push
  GIT_SSH_COMMAND="$(pwd)/skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py -i ~/.ssh/id_github -o StrictHostKeyChecking=accept-new" git push origin main
  
  # 6. Verify
  git status -sb  # Should show: ## main...origin/main
  ```
- [ ] **Push verification:** `git log origin/main..HEAD` shows no commits ahead. GitHub web UI shows all commits on `main`.

### Phase 8 Acceptance Gate

- [ ] MEP validation table complete; every FR has a phase + test.
- [ ] Every ADR's decision is reflected in the codebase.
- [ ] Directory structure matches PAD §3.2 exactly.
- [ ] No `TODO`, `FIXME`, `console.log`, placeholder values in committed code.
- [ ] `git log --oneline` shows clean, atomic, Conventional Commits messages.
- [ ] `git push origin main` succeeded via the SSH wrapper.
- [ ] GitHub web UI at `https://github.com/nordeim/programmer-blog` shows all commits on `main`.

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Next.js 16 `proxy.ts` API changes between minor versions. | Medium | High (build breaks) | Pin to Next.js 16.2.x. Test on every minor upgrade. |
| Better Auth 1.6.x has a breaking change in 1.7. | Low | Medium (auth breaks) | Pin to `better-auth@1.6.x`. Read release notes before upgrading. |
| `better-sqlite3` native binding fails to install on deploy host. | Low | High (app won't boot) | Use Node 20+ (which has prebuilt binaries for major platforms). Test the deploy host's platform in CI. |
| Resend rate-limits during a large email batch. | Medium | Medium (some subscribers don't get the email) | Batch in chunks of 100 with 1s delay. Mark failed sends as `bounced`. Retry queue (v1.5). |
| GitHub API rate-limits (60/hr unauthenticated). | High | Low (page shows fallback numbers) | 60s cache via `unstable_cache` means we hit the API at most 60 times/hour across all visitors. Within limits. |
| jsdom doesn't polyfill `IntersectionObserver` / `matchMedia` / `ResizeObserver` / `navigator.clipboard`. | High | Medium (tests fail) | Polyfill in `vitest.setup.ts`. |
| Mockup's `localStorage` theme approach causes hydration mismatch in Next.js SSR. | Certain (already known) | High (flash of wrong theme) | Mitigated by PAD §3.3 Pattern 1 (cookie + inline script). |
| `next/font/local` requires manual subsetting to keep font weight low. | Medium | Medium (LCP suffers if font is 500KB+) | Subset fonts to Latin + symbols + the 4 weights we use. Target ≤ 250KB total. |
| Tailwind v4 `@theme` block syntax changes. | Low | High (CSS breaks) | Pin to Tailwind v4.1.x. Test on upgrade. |
| `pnpm audit` flags a critical vulnerability in a transitive dep. | Medium | Medium (CI gate fails) | `pnpm update --latest` for the affected package. If no fix available, document the risk and override the audit (with justification). |

---

## 11. Commit Cadence & Message Conventions

### Conventions

- **Format:** `<type>(<scope>): <subject>` — types per `@commitlint/config-conventional`.
- **Scope:** the package or feature area (e.g. `landing`, `blog`, `admin`, `db`, `auth`, `email`, `ui`, `scaffold`).
- **Subject:** imperative mood, lowercase first letter, no period, ≤ 72 chars.
- **Body:** optional, explains *why* (not what). Wrapped at 100 chars.
- **Footer:** `Refs: FR-N` to tie commits to functional requirements.

**Examples:**
```
feat(landing): add hero section with typewriter greeting (FR-5, FR-6)

Implements the hero section per PRD FR-5. The typewriter hook (FR-6)
cycles through 5 greetings, respects prefers-reduced-motion, and
pauses on hidden tab via the Page Visibility API.

Refs: FR-5, FR-6
```

```
fix(theme): correct hydration mismatch on initial theme render

The mockup's localStorage-based theme approach caused a flash on
SSR. The fix reads the theme from a cookie set by an inline <head>
script, so the server-rendered <html data-theme> attribute matches
the client.

Refs: FR-4
```

### Cadence

Each phase produces 3-6 atomic commits. The total commit count for the engagement is ~25-30. Commits are pushed in a single `git push` at the end (Phase 8). No PRs — trunk-based, all commits land on `main`.

### Commit Pre-Flight

Before each commit:
- [ ] `pnpm check-types` green.
- [ ] `pnpm lint` green.
- [ ] `pnpm test` green (for affected packages).
- [ ] No `console.log`, `TODO`, `FIXME`, secrets in the diff.
- [ ] `git status` shows only intended files staged.

---

**End of MEP.** For requirements, see `Project_Requirements_Document.md`. For architecture, see `Project_Architecture_Document.md`.

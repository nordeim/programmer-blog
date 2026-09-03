# AGENTS.md

Compact instructions for AI coding agents working in `/dev/log`. Read before editing anything.

## TL;DR

- **Package manager is pnpm only.** Never `npm install` or `yarn`. Run scripts via `pnpm <script>`.
- **Trunk-based on `main`.** No feature branches, no PRs. Conventional Commits with `Refs: FR-N` footer.
- **TDD is mandatory.** Write the failing test first. Tests co-located: `Foo.tsx` ↔ `Foo.test.tsx`.
- **The full quality gate is `pnpm check`** (= `check-types && lint && test:coverage && audit --prod && build`). All must pass before push.
- **`landing_page_mockup.html` is the source of truth** for the landing page. `apps/web/src/app/globals.css` + `packages/config/tailwind/base.css` are 1:1 ports. Do not modify CSS without updating the mockup.

## Commands

| Task | Command |
|---|---|
| Dev server (Turbopack) | `pnpm dev` → http://localhost:3000 |
| Type-check all packages | `pnpm check-types` |
| Lint all packages | `pnpm lint` (auto-fix: `pnpm lint:fix`) |
| Test all packages | `pnpm test` (watch: `pnpm test:watch`) |
| Coverage | `pnpm test:coverage` |
| Production build | `pnpm build` → `apps/web/.next/standalone/` |
| **Full quality gate** | **`pnpm check`** |
| Generate SQL migration | `pnpm db:generate` (Drizzle Kit diffs schema.ts) |
| Apply migrations | `pnpm db:migrate` (creates `apps/web/devlog.db`) |
| Seed dev DB | `pnpm db:seed` (3 posts, 6 archive, 5 snippets, 1 author) |
| Drizzle Studio | `pnpm db:studio` → http://localhost:4983 |
| Single-package test | `pnpm --filter @devlog/web test` |

**Required order when verifying a change:** `pnpm check-types` → `pnpm lint` → `pnpm test` → `pnpm build`. `pnpm check` runs all four.

## Monorepo Layout

```
apps/web/         # Next.js 16 app (the only app)
packages/db/      # Drizzle schema + client + migrations (consumed via @devlog/db)
packages/auth/    # Homegrown HMAC auth (R-2: better-auth removed) — index.ts (Node) + tokens.ts (edge-safe split)
packages/email/   # React Email templates + Resend wrapper
packages/types/   # Shared Zod schemas + TS types
packages/config/  # Shared ESLint / TS / Tailwind bases
```

**Workspace:** `pnpm-workspace.yaml` declares `apps/*` and `packages/*`. Local packages are referenced in `tsconfig.base.json` paths (`@devlog/db`, `@devlog/auth`, `@devlog/email`, `@devlog/types`, `@devlog/config`) and consumed in `next.config.ts` via `transpilePackages`.

## The 5-Layer Golden Rule (review-blocking if violated)

A layer may only import from layers *below* it or from its own layer:

| Layer | Path | May NOT import |
|---|---|---|
| 0. proxy | `apps/web/src/middleware.ts` | DB, Drizzle, `@devlog/auth` root (only `@devlog/auth/tokens`) |
| 1. app | `apps/web/src/app/**` | `drizzle-orm`, `better-sqlite3`, `@devlog/db` directly — call features/lib instead |
| 2. features | `apps/web/src/features/**` | Other features' internals; `drizzle-orm` directly (use `@devlog/db/queries`) |
| 3. domain | `apps/web/src/domain/**` | React, Drizzle, better-sqlite3, resend — pure TS only |
| 4. lib | `apps/web/src/lib/**` | (free pass — this is where Node-only deps live) |

**`apps/web/src/middleware.ts` is Edge Runtime.** Importing `@devlog/auth` (which pulls `better-sqlite3`) breaks the build. Import `@devlog/auth/tokens` instead — it's pure Web Crypto (HMAC-SHA256) with no Node deps.

## TypeScript — Strict, Non-Negotiable

`tsconfig.base.json` locks these flags. Do not relax:

- `strict: true`
- `noUncheckedIndexedAccess: true` — arrays return `T | undefined`. Always narrow or use `.?`.
- `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`
- **`erasableSyntaxOnly: true`** — forbids `enum` and `namespace`. Use `as const` objects + union types.
- `isolatedModules: true`
- `target: ES2022`, `module: preserve`, `moduleResolution: bundler`

**Forbidden:**
- `as any` — lint blocks it. Use `unknown` + narrow, or `satisfies`.
- Default exports in `apps/web/src/**` — use named exports only.
- `enum` / `namespace` — see above.

## Tailwind v4 (CSS-First, No Config File)

- **No `tailwind.config.ts`.** All tokens live in `@theme` blocks in `packages/config/tailwind/base.css` and `apps/web/src/app/globals.css`.
- **Themes via `[data-theme="dark|light|cyber"]`** on `<html>`. Do not add a 4th theme — the design budget is closed.
- **Component classes** (`.btn-primary`, `.article-card`, `.code-window`, etc.) are in `globals.css` ported verbatim from the mockup. Do not re-implement with utilities.
- **No arbitrary values** like `text-[#abc]`. Use the design token (`text-accent`, `bg-bg-elev`) or extend `@theme`.

## Next.js 16 Quirks

- **`middleware.ts` (not `proxy.ts`).** Next.js 16 renamed middleware → proxy; we keep `middleware.ts` for ecosystem compatibility. The matcher is `['/admin/:path*']`.
- **`output: 'standalone'`** — build produces a self-contained server in `apps/web/.next/standalone/`.
- **MDX is first-class** — `pageExtensions: ['ts','tsx','js','jsx','md','mdx']`. Content lives in `apps/web/content/{posts,snippets}/*.mdx`.
- **PPR is disabled** (`experimental.cacheComponents` commented out in `next.config.ts`). Enable in Phase 4+ when the landing page is fully built.
- **Security headers** are declared inline in `next.config.ts` (CSP, X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy, HSTS). Edit there, not in middleware.

## Database — SQLite Only

- **Schema:** `packages/db/src/schema.ts` — 7 tables: `users`, `sessions`, `posts`, `tags`, `postsToTags`, `subscribers`, `comments`, `siteSettings`.
- **Queries boundary:** `packages/db/src/queries.ts`. Layer 1/2 must call queries from there, not Drizzle directly.
- **Migrations** are committed: `pnpm db:generate` (diff schema.ts → write SQL) → review the SQL → `pnpm db:migrate` (apply). Never `db:push` outside a throwaway dev DB.
- **Timestamps** are `integer('...', { mode: 'timestamp' })` with `default(sql\`(unixepoch())\`)`. Drizzle returns `Date` objects.
- **`siteSettings` is a single row** (`id = 1`). Application enforces "no second row."
- **Type inference** via `typeof posts.$inferSelect`. Never hand-write row types.

## Auth — Homegrown HMAC (Better Auth removed per ADR-004 amendment)

- **`better-auth` is no longer a dependency** (audit remediation R-2). All auth lives in `@devlog/auth`:
  - `src/index.ts` — `signIn` / `getSession` / `requireAuthor` / `signOut` (Node-only: Drizzle + better-sqlite3). `getSessionFromCookies` uses `next/headers` (peer dep).
  - `src/tokens.ts` — edge-safe HMAC-SHA256 (`node:crypto`, `timingSafeEqual`). Exports `SESSION_COOKIE`, `createSessionToken()`, `verifySessionToken()`, `signToken()`, `verifyToken()`.
  - `src/password.ts` — scrypt `hashPassword()` / `verifyPassword()` (format `scrypt:N:r:p:salt:hash`).
- **Session cookie:** `devlog_session` (named via `SESSION_COOKIE` constant). Token format `<userId>.<hmac>`, 30-day TTL.
- **Role enum** (as `as const` union, not `enum`): `'author' | 'subscriber'` on `users.role` (schema mirror in `@devlog/types`). Only `author` may access `/admin/*` — enforced by `requireAuthor()` in the admin layout; the edge middleware only verifies the session HMAC.
- **Secrets:** `BETTER_AUTH_SECRET` (env name kept for compat) MUST be ≥32 chars in production or `getSecret()` throws.

## Server Actions

- **Location:** `apps/web/src/features/{feature}/actions.ts` with `'use server'` at the top.
- **Return shape:** discriminated union — `{ status: 'ok', data } | { status: 'error', fieldErrors?, message? }`. **Never throw** across the network boundary.
- **Validate every input with Zod.** Never read `FormData` without parsing through a schema.
- **Auth check first.** Call `requireAuthor(cookieValue)` from `@/lib/auth` (or `verifySessionToken()` from `@devlog/auth/tokens` on the edge) — never hand-parse the session cookie yourself.

## Testing Conventions

- **Co-located:** `Component.tsx` ↔ `Component.test.tsx` next to it. Same for `lib/foo.ts` ↔ `lib/foo.test.ts`.
- **Vitest + jsdom** via `apps/web/vitest.config.ts` + `vitest.setup.ts`.
- **Vitest mock hoisting gotcha:** `vi.mock()` is hoisted above imports. **Never reference outer-scope variables inside the factory** — inline everything. ESLint's `react-hooks` plugin warns on the related `set-state-in-effect` pattern.
- **No JSX in `.test.ts` files.** Use `.test.tsx` if the test renders components.
- **TDD order:** write failing test → run `pnpm test` and watch it fail → implement → run `pnpm test` and watch it pass → refactor.

## Git Workflow

- **Trunk-based on `main`.** No feature branches, no PRs.
- **Conventional Commits** format: `<type>(<scope>): <subject>` (subject ≤72 chars). Scopes: `blog`, `admin`, `auth`, `email`, `db`, `landing`, `subscribe`, `validation`, `ssh-wrapper`, etc.
- **Atomic commits.** One logical change per commit. If you can't summarize in one line, split it.
- **Footer `Refs: FR-N`** ties the commit to a PRD requirement. Example:
  ```
  feat(blog): add /rss.xml route + tests (FR-23)

  Refs: PRD FR-23; PAD §3.4
  ```
- **No `git push --force` to `main`.** Push a `fix:` commit on top.

### SSH Push (when OpenSSH is unavailable)

If `git push` fails with `Permission denied (publickey)` or `which ssh` returns nothing, use the included wrapper:

```bash
GIT_SSH_COMMAND="skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py -i docs/ssh-key.txt -o StrictHostKeyChecking=accept-new" git push origin main
```

The wrapper is Paramiko-based and handles the `shlex.join()` quoting bug that breaks naive SSH wrappers. If `python3 -c "import paramiko"` fails, install into the correct Python: `$(which python3) -m pip install paramiko`. Full troubleshooting in `skills/how-to-git-push-using-ssh-wrapper/SKILL.md`.

## Env Vars

**Never read `process.env.FOO` directly** in feature/component code. Use `apps/web/src/lib/env.ts` (Zod-validated, throws at boot in prod). 12 vars total — see `.env.example` for the full list with comments. Public vars (`NEXT_PUBLIC_*`) are inlined by Next.js and safe to read in client components.

Required in prod (will throw at boot if missing): `BETTER_AUTH_SECRET` (32+ chars), `SIGNED_TOKEN_SECRET` (32+ chars). Optional in dev: `RESEND_API_KEY` (subscribe flow degrades gracefully without it).

## Don't Do This

- Import `@devlog/auth` (root) in `middleware.ts` — breaks the Edge Runtime. Use `@devlog/auth/tokens`.
- Use `enum`, `namespace`, `as any`, default exports — all lint-blocked.
- Add a 4th theme — design budget is closed (dark/light/cyber only).
- Use Postgres, Redis, or any DB other than SQLite (single file at `apps/web/devlog.db`).
- Use Framer Motion, GSAP, or any animation library — CSS-only `@keyframes` is the rule (Lighthouse ≥95 budget).
- Use arbitrary Tailwind values (`text-[#abc]`) — use design tokens or extend `@theme`.
- Use `pnpm db:push` in prod — always `db:generate` → review → `db:migrate`.
- Skip the failing test — TDD order is non-negotiable.
- Modify `skills/**` — these are read-only reference skills, not part of the project.

---

$ pnpm build
[WARN] The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: "pnpm.overrides". See https://pnpm.io/settings for the new home of each setting.

> devlog@1.0.0 build /Home1/project/programmer-blog
> turbo run build

• turbo 2.10.12

   • Packages in scope: @devlog/auth, @devlog/config, @devlog/db, @devlog/email, @devlog/types, @devlog/web
   • Running build in 6 packages
   • Remote caching disabled

@devlog/web:build: cache miss, executing c184dbec2eea8aad
@devlog/web:build:
@devlog/web:build: > @devlog/web@1.0.0 build /Home1/project/programmer-blog/apps/web
@devlog/web:build: > next build
@devlog/web:build:
@devlog/web:build: ▲ Next.js 16.3.3 (Turbopack)
@devlog/web:build: ✓ Running next.config.ts took 33ms
@devlog/web:build:
@devlog/web:build: ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
@devlog/web:build:
@devlog/web:build:   To migrate automatically, run:
@devlog/web:build:   npx @next/codemod@canary middleware-to-proxy .
@devlog/web:build:
@devlog/web:build:   Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
@devlog/web:build:   Creating an optimized production build ...
@devlog/web:build: ✓ Compiled successfully in 11.3s
@devlog/web:build: ✓ Finished TypeScript in 7.8s
  Collecting page data using 3 workers  .[posts/generateStaticParams] DB unavailable, skipping prerender SqliteError: no such table: posts
@devlog/web:build:     at bu (../../packages/db/src/queries.ts:84:6)
@devlog/web:build:     at l (src/app/(public)/posts/[slug]/page.tsx:67:23)
@devlog/web:build:   82 |     .limit(pageSize)
@devlog/web:build:   83 |     .offset(offset)
@devlog/web:build: > 84 |     .all();
@devlog/web:build:      |      ^
@devlog/web:build:   85 | }
@devlog/web:build:   86 |
@devlog/web:build:   87 | export async function getArchiveCount(tagSlug?: string, query?: string) { {
@devlog/web:build:   code: 'SQLITE_ERROR'
@devlog/web:build: }
@devlog/web:build: ✓ Collecting page data using 3 workers in 1253ms
  Generating static pages using 3 workers (16/22)  [==  ][rss] DB unavailable, generating minimal feed SqliteError: no such table: posts
@devlog/web:build:     at iN (../../packages/db/src/queries.ts:189:6)
@devlog/web:build:     at i (src/app/api/rss.xml/route.ts:32:7)
@devlog/web:build:   187 |     .orderBy(desc(posts.publishedAt))
@devlog/web:build:   188 |     .limit(limit)
@devlog/web:build: > 189 |     .all();
@devlog/web:build:       |      ^
@devlog/web:build:   190 | }
@devlog/web:build:   191 |
@devlog/web:build:   192 | // ── Subscribers ───────────────────────────────────────────────────────────── {
@devlog/web:build:   code: 'SQLITE_ERROR'
@devlog/web:build: }
@devlog/web:build: [sitemap] DB unavailable, generating minimal sitemap SqliteError: no such table: posts
@devlog/web:build:     at i$ (../../packages/db/src/queries.ts:84:6)
@devlog/web:build:     at p (src/app/api/sitemap.xml/route.ts:54:7)
@devlog/web:build:   82 |     .limit(pageSize)
@devlog/web:build:   83 |     .offset(offset)
@devlog/web:build: > 84 |     .all();
@devlog/web:build:      |      ^
@devlog/web:build:   85 | }
@devlog/web:build:   86 |
@devlog/web:build:   87 | export async function getArchiveCount(tagSlug?: string, query?: string) { {
@devlog/web:build:   code: 'SQLITE_ERROR'
@devlog/web:build: }
✓ Generating static pages using 3 workers (22/22) in 616ms
@devlog/web:build: Turbopack build encountered 1 warning:
@devlog/web:build: ./packages/auth/src/tokens.ts:16:1
@devlog/web:build: Warning: A Node.js module is loaded ('node:crypto' at line 16) which is not supported in the Edge Runtime.
@devlog/web:build:     Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime
@devlog/web:build:   14 |  * subscriberId, etc.).
@devlog/web:build:   15 |  */
@devlog/web:build: > 16 | import { createHmac, timingSafeEqual } from 'node:crypto';
@devlog/web:build:      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
@devlog/web:build:   17 |
@devlog/web:build:   18 | export const SESSION_COOKIE = 'devlog_session';
@devlog/web:build:   19 | const TOKEN_SEPARATOR = '.';
@devlog/web:build:
@devlog/web:build: Ecmascript file had an error
@devlog/web:build:
@devlog/web:build: Import traces:
@devlog/web:build:   #1 [App Route]:
@devlog/web:build:     ./packages/auth/src/tokens.ts
@devlog/web:build:     ./apps/web/src/app/api/confirm/route.ts
@devlog/web:build:
@devlog/web:build:   #2 [Edge Middleware]:
@devlog/web:build:     ./packages/auth/src/tokens.ts
@devlog/web:build:     ./apps/web/src/middleware.ts
@devlog/web:build:
@devlog/web:build:   #3 [Server Component]:
@devlog/web:build:     ./packages/auth/src/tokens.ts
@devlog/web:build:     ./apps/web/src/app/(public)/unsubscribe/page.tsx
@devlog/web:build:
@devlog/web:build:   #4 [Server Component]:
@devlog/web:build:     ./packages/auth/src/tokens.ts
@devlog/web:build:     ./apps/web/src/features/subscribe/actions.ts
@devlog/web:build:
@devlog/web:build:
@devlog/web:build: ✓ Finalizing page optimization in 1861ms
@devlog/web:build:
@devlog/web:build: Route (app)                    Revalidate  Expire
@devlog/web:build: ┌ ƒ /
@devlog/web:build: ├ ƒ /_not-found
@devlog/web:build: ├ ƒ /admin
@devlog/web:build: ├ ƒ /admin/comments
@devlog/web:build: ├ ƒ /admin/login
@devlog/web:build: ├ ƒ /admin/posts
@devlog/web:build: ├ ƒ /admin/posts/[id]
@devlog/web:build: ├ ƒ /admin/posts/new
@devlog/web:build: ├ ƒ /admin/settings
@devlog/web:build: ├ ƒ /admin/subscribers
@devlog/web:build: ├ ƒ /admin/subscribers/export
@devlog/web:build: ├ ƒ /api/confirm
@devlog/web:build: ├ ƒ /api/github-stats
@devlog/web:build: ├ ○ /api/robots.txt                    1d      1y
@devlog/web:build: ├ ○ /api/rss.xml                       1h      1y
@devlog/web:build: ├ ○ /api/sitemap.xml                   1h      1y
@devlog/web:build: ├ ƒ /archive
@devlog/web:build: ├ ƒ /archive/page/[page]
@devlog/web:build: ├ ● /posts/[slug]
@devlog/web:build: ├ ƒ /preferences
@devlog/web:build: ├ ƒ /snippets
@devlog/web:build: ├ ƒ /snippets/[slug]
@devlog/web:build: └ ƒ /unsubscribe
@devlog/web:build:
@devlog/web:build:
@devlog/web:build: ƒ Proxy (Middleware)
@devlog/web:build:
@devlog/web:build: ○  (Static)   prerendered as static content
@devlog/web:build: ●  (SSG)      prerendered as static HTML (uses generateStaticParams)
@devlog/web:build: ƒ  (Dynamic)  server-rendered on demand
@devlog/web:build:
@devlog/web:build:

 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    25.41s


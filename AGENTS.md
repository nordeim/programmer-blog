# AGENTS.md

Compact instructions for AI coding agents working in `/dev/log`. Read before editing anything.

## TL;DR

- **Package manager is pnpm only.** Never `npm install` or `yarn`. Run scripts via `pnpm <script>`.
- **Trunk-based on `main`.** No feature branches, no PRs. Conventional Commits with `Refs: FR-N` footer.
- **TDD is mandatory.** Write the failing test first. Tests co-located: `Foo.tsx` ↔ `Foo.test.tsx`.
- **The full quality gate is `pnpm check`** (= `check-types && lint && test:coverage && audit --prod && build`). All must pass before push.
- **`landing_page_mockup.html` is the source of truth** for the landing page. `apps/web/src/app/globals.css` + `packages/config/tailwind/base.css` are 1:1 ports. Do not modify CSS without updating the mockup.
- **Fresh-clone prod start is `bash start_server.sh`** (see Commands) — handles env + DB + gate + build + standalone.

## Commands

| Task | Command |
|---|---|
| Dev server (Turbopack) | `pnpm dev` → http://localhost:3000 |
| Type-check all packages | `pnpm check-types` |
| Lint all packages | `pnpm lint` (auto-fix: `pnpm lint:fix`) |
| Test all packages | `pnpm test` (watch: `pnpm test:watch`) |
| Coverage | `pnpm test:coverage` |
| Production build | `pnpm build` → `apps/web/.next/standalone/` (standalone output) |
| Production start | `pnpm start` → `node apps/web/.next/standalone/apps/web/server.js` (use `pnpm --filter @devlog/web start:next` for `next start`) |
| **Full quality gate** | **`pnpm check`** |
| Generate SQL migration | `pnpm db:generate` (`drizzle-kit generate --config ./drizzle.config.ts` in `@devlog/db`) |
| Apply migrations | `pnpm db:migrate` (creates `apps/web/devlog.db`) |
| Seed dev DB | `pnpm db:seed` (9 posts, 12 tags, 3 subscribers, 2 comments, 1 author — snippets are MDX files, not DB rows; log shows **totals** in file, not delta — re-running on a dirty `devlog.db` reports higher totals) |
| Init DB from scratch | `pnpm db:setup` (= `db:generate && db:migrate && db:seed`) |
| Drizzle Studio | `pnpm db:studio` → http://localhost:4983 |
| Single-package test | `pnpm --filter @devlog/web test` |
| Fresh-clone prod start (migrate+seed+gate+build+standalone) | `bash start_server.sh` → http://localhost:3000 (canonical https://programmer-blog.jesspete.shop), `server.log`/`server.pid` |

**Required order when verifying a change:** `pnpm check-types` → `pnpm lint` → `pnpm test` → `pnpm build`. `pnpm check` runs all four.

> `start_server.sh` runs `check-types+lint+test` before `build`, kills prior `:3000`, sources `.env.local` via `bash set -a; .` (not `source` — `dash` trap), syncs `apps/web/.env.local`, and is re-runnable/idempotent.

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
| 0. proxy | `apps/web/src/proxy.ts` (replaces `middleware.ts` since Next 16.3.4) | DB, Drizzle, `@devlog/auth` root (only `@devlog/auth/tokens`) |
| 1. app | `apps/web/src/app/**` | `better-sqlite3`, `drizzle-orm/sqlite-core` — call `@devlog/db` query helpers instead |
| 2. features | `apps/web/src/features/**` | Other features' internals; `drizzle-orm/sqlite-core` (use `@devlog/db/queries`) |
| 3. domain | `apps/web/src/domain/**` | React, Drizzle, better-sqlite3, resend — pure TS only |
| 4. lib | `apps/web/src/lib/**` | (free pass — this is where Node-only deps live) |

**Drizzle precision (R-46):** route/action files MAY import drizzle-orm *operators* (`eq`, `and`, `desc`, `count`, …) and query functions from `@devlog/db` — that is the as-built pattern. Still forbidden everywhere outside `packages/db` + `lib`: `drizzle-orm/sqlite-core` (table definitions), `better-sqlite3`, and opening a raw client.

**`apps/web/src/proxy.ts` is Edge Runtime.** Importing `@devlog/auth` (which pulls `better-sqlite3`) breaks the build. Import `@devlog/auth/tokens` instead — it's pure Web Crypto (`crypto.subtle` HMAC-SHA256, `async`, no `node:crypto`/`Buffer`) with no Node deps.

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
- Default exports in `apps/web/src/**` — EXCEPT the files Next.js itself requires to default-export (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `manifest.ts`, `opengraph-image.tsx`, route handlers). Everything else uses named exports. Pass 6 doc sync (I-11).
- `enum` / `namespace` — see above.

## Tailwind v4 (CSS-First, No Config File)

- **No `tailwind.config.ts`.** All tokens live in `@theme` blocks in `packages/config/tailwind/base.css` and `apps/web/src/app/globals.css`.
- **Themes via `[data-theme="dark|light|cyber"]`** on `<html>`. Do not add a 4th theme — the design budget is closed.
- **Component classes** (`.btn-primary`, `.article-card`, `.code-window`, etc.) are in `globals.css` ported verbatim from the mockup. Do not re-implement with utilities.
- **No arbitrary literal values** like `text-[#abc]` or `w-[137px]`. Design tokens as arbitrary `var()` values — `bg-[var(--bg-elev)]`, `text-[var(--muted)]` — ARE the established as-built pattern (they reference `@theme` tokens directly) and are allowed. Pass 6 doc sync (I-11).

## Next.js 16 Quirks

- **`proxy.ts` (replaces `middleware.ts` since 16.3.4).** Next 16 renamed `middleware.ts` → `proxy.ts`; build **errors** if both exist. The matcher is `['/admin/:path*']`. Keep only `apps/web/src/proxy.ts` (`export async function proxy`).
- **Standalone deploys need the postbuild copy.** `output: 'standalone'` leaves `.next/static` + `public/` out of `.next/standalone/`; `pnpm build` runs `postbuild` (`src/scripts/copy-standalone-assets.ts`, R-33) to mirror them in. Never delete the postbuild script — that's how the live landing page went unstyled (C-34).
- **Feed URLs are rewrites.** `/rss.xml`, `/sitemap.xml`, `/robots.txt` are rewrites onto the `/api/*` handlers (R-34) — pinned by `src/next.config.test.ts`. All three (plus the prerendered `posts/[slug]` + `/admin/login`) **revalidate hourly** (R-49/R-52): absolute URLs in prerendered HTML bake the BUILD environment's `NEXT_PUBLIC_SITE_URL`, so CI builds must run with it set, and hourly revalidation lets fresh deploys self-heal from the runtime env. Pinned by `src/revalidate-contract.test.ts`.
- **`output: 'standalone'`** — build produces `apps/web/.next/standalone/apps/web/server.js`. Start with `node apps/web/.next/standalone/apps/web/server.js` (not `next start`).
- **MDX is first-class** — `pageExtensions: ['ts','tsx','js','jsx','md','mdx']`.
- **Content sources (as-built):** blog POSTS live in SQLite (`packages/db/src/seed.ts` seeds them; admin CRUD manages them) and render through `renderMDX`. Only SNIPPETS are MDX files, in `apps/web/content/snippets/*.mdx`. There is no `content/posts/` directory (Pass 6 doc sync, I-9/I-11).
- **PPR is disabled** (`experimental.cacheComponents` commented out in `next.config.ts`). Enable in Phase 4+ when the landing page is fully built.
- **Security headers** are declared inline in `next.config.ts` (CSP, X-Content-Type-Options, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy, HSTS). Edit there, not in `proxy.ts`.

## Database — SQLite Only

- **Schema:** `packages/db/src/schema.ts` — 8 tables: `users`, `sessions` (reserved — the stateless HMAC auth never reads it), `posts`, `tags`, `postsToTags`, `subscribers`, `comments`, `siteSettings`.
- **Queries boundary:** `packages/db/src/queries.ts`. Layer 1/2 must call queries from there, not Drizzle directly.
- **Runtime client fails fast (R-38):** if the resolved `DATABASE_PATH` does not exist, the client throws an actionable error instead of letting better-sqlite3 silently create an empty database (that is how a standalone deploy 500-ed `/archive` + `/posts/[slug]` — audit C-36). Only `runMigrations()` may create a fresh file.
- **SQLite dialect rules (R-32, regression-pinned):** no `::` casts (use drizzle's `count()`), and never bind a `Date` into raw `sql` fragments — convert with `postEpochSeconds()` (epoch seconds is the stored unit). Both rules have integration coverage in `packages/db/src/queries.test.ts`.
- **Migrations** are committed: `pnpm db:generate` (diff schema.ts → write SQL) → review the SQL → `pnpm db:migrate` (apply). Never `db:push` outside a throwaway dev DB.
- **Timestamps** are `integer('...', { mode: 'timestamp' })` with `default(sql\`(unixepoch())\`)`. Drizzle returns `Date` objects.
- **`siteSettings` is a single row** (`id = 1`). Application enforces "no second row."
- **Type inference** via `typeof posts.$inferSelect`. Never hand-write row types.

## Auth — Homegrown HMAC (Better Auth removed per ADR-004 amendment)

- **`better-auth` is no longer a dependency** (audit remediation R-2). All auth lives in `@devlog/auth`:
  - `src/index.ts` — `signIn` / `getSession` / `requireAuthor` / `signOut` (Node-only: Drizzle + better-sqlite3). `getSessionFromCookies` uses `next/headers` (peer dep).
  - `src/tokens.ts` — edge-safe HMAC-SHA256 via **Web Crypto `crypto.subtle`** (`async`, `timingSafeEqualHex`, no `node:crypto`/`Buffer`). Exports `SESSION_COOKIE`, `createSessionToken()`, `verifySessionToken()`, `signToken()`, `verifyToken()` (all `async`).
  - `src/password.ts` — scrypt `hashPassword()` / `verifyPassword()` (format `scrypt:N:r:p:salt:hash`).
- **Session cookie:** `devlog_session` (named via `SESSION_COOKIE` constant). Token v2 format (R-39): `<userId>.<iat-seconds>.<hmac(userId.iat)>` — `verifySessionToken` enforces the 30-day TTL **server-side**; legacy 2-part session tokens are rejected. **Transaction tokens** (R-80, Pass 7): confirm links are v2 `<subscriberId>.<iat>.confirm.<hmac>` with a server-enforced **7-day TTL**; unsubscribe/preferences links stay long-lived v1 (`<subscriberId>.<hmac>`) so links already in inboxes keep working — `verifyTransactionToken(token, id, purpose)` enforces the purpose split (a confirm token cannot manage a subscription and vice versa).
- **Role enum** (as `as const` union, not `enum`): `'author' | 'subscriber'` on `users.role` (schema mirror in `@devlog/types`). Only `author` may access `/admin/*` — enforced by `requireAuthor()` in the **`(dashboard)` shell layout** (`src/app/(auth)/admin/(dashboard)/layout.tsx`, R-31 route group — the login page renders outside it); the edge `proxy` only verifies the session HMAC (`await verifySessionToken`).
- **Secrets:** `BETTER_AUTH_SECRET` (env name kept for compat) MUST be ≥32 chars in production or `getSecret()` throws.

## Server Actions

- **Location:** `apps/web/src/features/{feature}/actions.ts` with `'use server'` at the top.
- **Async-function exports only (R-48, review-blocking):** a `'use server'` file may export **only async functions**. Exporting a Zod schema object, a constant, or re-exporting one (`export { schema }`) makes the Server Actions loader throw `A "use server" file can only export async functions, found object.` at module-evaluation time — which 500s **every** action in that file while unit tests stay green (audit C-37: all six mutations were dead in production this way). Shared schemas live in plain modules: `@devlog/types` and `features/{feature}/schemas.ts`. `use-server-exports-scan.test.ts` enforces this.
- **Return shape:** discriminated union — `{ ok: true, message?, data? } | { ok: false, error, fieldErrors? }` (as-built Pass 7 doc sync, R-94; the pre-Pass-2 `{ status: … }` shape no longer exists). **Never throw** across the network boundary.
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

**Never read `process.env.FOO` directly** in feature/component code. Use `apps/web/src/lib/env.ts` (Zod-validated, throws at boot in prod). 13 vars total (plus `NODE_ENV`) — see `.env.example` for the full list with comments. Public vars (`NEXT_PUBLIC_*`) are inlined by Next.js and safe to read in client components.

**Required in prod (throw at boot if missing, R-61/M-45): `BETTER_AUTH_SECRET` (32+ chars) and `SIGNED_TOKEN_SECRET` (32+ chars).** **Empty = unset (R-73/H-40):** a present-but-empty env var (`RESEND_API_KEY=`) is normalized to absent before Zod parsing — the documented `cp .env.example .env.local` quick start no longer crashes prod builds. Production seeds require a `DEV_AUTHOR_PASSWORD` of **≥16 chars** (R-92). `SIGNED_TOKEN_SECRET` keys the transaction tokens (subscribe confirm/unsubscribe/preferences) since R-62/M-46 — session cookies stay keyed by `BETTER_AUTH_SECRET`; in dev the transaction tokens fall back to the session secret. Optional in dev: `RESEND_API_KEY` (subscribe flow degrades gracefully without it), `DEV_AUTHOR_PASSWORD` (overrides the seeded dev author password; the login-page credentials hint renders in **development only**, R-37; **production seeds refuse the public default without it**, R-57/C-38 — `start_server.sh` generates a strong one automatically). `CRON_SECRET` is reserved — no cron routes exist yet. In production, a localhost `NEXT_PUBLIC_SITE_URL` triggers a loud boot warning (R-41) — set it to the real origin.

## Don't Do This

- Import `@devlog/auth` (root) in `proxy.ts` — breaks the Edge Runtime. Use `@devlog/auth/tokens`.
- Use `enum`, `namespace`, `as any`, default exports — all lint-blocked.
- Add a 4th theme — design budget is closed (dark/light/cyber only).
- Use Postgres, Redis, or any DB other than SQLite (single file at `apps/web/devlog.db`).
- Use Framer Motion, GSAP, or any animation library — CSS-only `@keyframes` is the rule (Lighthouse ≥95 budget).
- Use arbitrary Tailwind values (`text-[#abc]`) — use design tokens or extend `@theme`.
- Use `pnpm db:push` in prod — always `db:generate` → review → `db:migrate`.
- Skip the failing test — TDD order is non-negotiable.
- Export a non-async value (schema, constant, class, re-export) from a `'use server'` file — see Server Actions above (R-48).
- Modify `skills/**` — these are read-only reference skills, not part of the project.
- Read the session cookie via the literal `'devlog_session'` — always use the `SESSION_COOKIE` constant (a source-scan test fails the suite otherwise, R-42).
- Read a client-supplied IP in a Server Action — the rate-limit key comes from `getClientIpFromHeaders(await headers())` ONLY; `ctx.ip`-style arguments are attacker-serializable (R-58/H-39, pinned by `server-action-ip-scan.test.ts`). The key is the **rightmost** `X-Forwarded-For` entry (R-76/M-50 — appending proxies put the proxy-observed client last; the first entry is attacker-set).
- Import `@/features/*` from `lib/`, or another feature's internals from a feature — layer boundaries are pinned by `layer-boundary-scan.test.ts` (R-63/M-47); the only exception is another feature's public API (`actions.ts`/`schemas.ts`).
- Ship `LIKE '%query%'` search over user input — SQLite treats `%`/`_` as wildcards and drizzle's `like()` has no `ESCAPE`; use the `instr()`-based `buildSearchCondition` in `packages/db/src/queries.ts` (R-66/L-41).
- Seed a production DB without `DEV_AUTHOR_PASSWORD` — `runSeed()` throws rather than using the public dev default (R-57/C-38).
- Commit `.env.local` — it is gitignored and must stay untracked; it was once force-added with real secrets (C-40, R-71). Secrets live in the deploy environment only.


## Pass 7 doc sync (R-94, 2026-09-04)

Tiered review + live E2E (Pass 7) remediated C-41, H-40, H-42, M-49..M-55 and L-45..L-56 (R-72..R-93). Contract changes an agent must know:

- **Server Action return shape is `{ ok: true/false, … }`** — not the `{ status: … }` shape this file documented before Pass 7.
- **Empty env var = unset** (R-73). Do not rely on `RESEND_API_KEY=''` failing validation.
- **Transaction token v2** for confirmations (7-day TTL, purpose-tagged, R-80); manage links long-lived. Confirm email copy says "7 days".
- **Unsubscribe is POST-only** (R-74): `/unsubscribe` GET renders a confirmation form; only `confirmUnsubscribe` (in `features/subscribe/actions.ts`) writes. Never re-introduce a DB write during render.
- **`/robots.txt` ships hourly `Cache-Control`** matching its ISR (R-75) — keep feed cache policies consistent.
- **`posts_to_tags` has a unique (post, tag) index** (R-82) — dedupe `tagSlugs` before inserting join rows.
- **`.env.local.example` is placeholder-only** (R-72/C-41) and pinned by `env-example-scan.test.ts`; never commit real values to any tracked file.
- **CSP now pins `base-uri 'self'; object-src 'none'; form-action 'self'`** (R-81).
- Per-page **`alternates.canonical`** on `/archive`, `/archive/page/[page]`, `/snippets` (R-78) — new public pages must declare their own canonical.
- **Hero mouse-glow tracks the parent hero section** (`useMouseGlow({ track: 'parent' })`, R-79) — a `pointer-events: none` overlay can never be an event target in a real browser.

---
IMPORTANT: File is read fresh for every conversation. Be brief and practical.
project_type: nextjs-monorepo
framework: next.js-16-app-router
last_updated: 2026-09-05 (Pass 9)
# Revalidated 2026-09-05 — Pass 9 remediation (R-98..R-101): `@layer components` is load-bearing in globals.css (H-44 — unlayered display rules kill `hidden`/`sm:inline-flex`/`md:inline-block`), marquee text `--fg-dim` for WCAG AA contrast on the glow-tinted background (M-58, mockup-first), Lighthouse ≥95 qualified as a local-build metric (M-59), auth header docstring re-synced to session token v2 (L-59)
---

# `/dev/log` — Programmer Blog

Production-grade programmer blog (package name: `devlog`) — Next.js 16 App Router, React 19, Tailwind CSS v4, Drizzle ORM + better-sqlite3, homegrown HMAC auth (`@devlog/auth`, see ADR-004 amendment), Resend, Vitest. Monorepo managed by pnpm + Turborepo. The landing page is a pixel-for-pixel port of `landing_page_mockup.html` (the source of truth — **DO NOT MODIFY**).

**Maintainer:** Alex Rivera. Trunk-based on `main`. TDD (Red→Green→Refactor) is mandatory for every code change.

---

## Foundational Principles

### Meticulous Approach (Six-Phase Workflow)

Follow for all implementation tasks:

1. **ANALYZE** — Read the PRD/PAD/MEP triple before touching code. Map every change to an FR-N in the PRD. Surface-level reading is not enough.
2. **PLAN** — Pick the MEP phase that owns this work; produce a RED→GREEN→REFACTOR checklist. Present the plan before coding.
3. **VALIDATE** — Confirm the layer boundaries (§Project-Specific Standards below) are respected before writing the first test.
4. **IMPLEMENT** — Write the failing test first, then the implementation, then refactor. Commit atomically with `Refs: FR-N` footer.
5. **VERIFY** — `pnpm check` (`check-types && lint && test:coverage && audit --prod && build` — five stages, R-97) must be green before push. Never break `main`.
6. **DELIVER** — Update the SKILL.md / PRD if the change introduces a new pattern, anti-pattern, or lesson.

### Project-Specific Principles

- **Mockup is the source of truth.** `landing_page_mockup.html` defines layout, color tokens, keyframes, and component classes. `apps/web/src/app/globals.css` and `packages/config/tailwind/base.css` are 1:1 ports. Any visual change starts in the mockup, then propagates to CSS.
- **Trunk-based, no PRs.** All commits to `main`. Atomic Conventional Commits with `Refs: FR-N` footer. No feature branches.
- **TDD or it didn't happen.** Every line of production code is preceded by a failing test. Tests live next to source (`Component.test.tsx`).
- **Edge-safe auth split.** `packages/auth/src/tokens.ts` is pure Web Crypto (`crypto.subtle`, `async`) so the `proxy.ts` Edge layer can import it without bundling Node-only deps.
- **CSS-only animation.** No Framer Motion, no GSAP. All motion is `@keyframes` + `transition`. Lighthouse ≥95 is the design budget — measured against **local builds on loopback** (R-101/M-59: live remote runs include hosting-region latency and read lower; don't treat a remote live score as the budget metric).
- **SQLite is the only DB.** better-sqlite3, single file at `apps/web/devlog.db`. No Postgres, no Redis. Drizzle handles migrations (`pnpm db:generate` → `pnpm db:migrate`).

---

## Implementation Standards

### TypeScript (strict, non-negotiable)

`tsconfig.base.json` locks these flags — do not relax:

- `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `noFallthroughCasesInSwitch: true`
- `erasableSyntaxOnly: true` — **forbids `enum`, `namespace`, and other non-erasable syntax.** Use `as const` objects + union types instead.
- `isolatedModules: true`, `verbatimModuleSyntax: false`
- `target: ES2022`, `module: preserve`, `moduleResolution: bundler`
- Path aliases: `@devlog/db`, `@devlog/auth`, `@devlog/email`, `@devlog/types`, `@devlog/config` (defined in `tsconfig.base.json` + `pnpm-workspace.yaml`)

**TypeScript rules:**
- Never use `any` — use `unknown` and narrow. `as any` is forbidden; lint blocks it.
- Use `interface` for object shapes, `type` for unions/intersections.
- Use `import type` for type-only imports when the symbol is not also a value.
- Prefer named exports. Default exports are forbidden in `apps/web/src/**` EXCEPT the files Next.js requires to default-export (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `manifest.ts`, `opengraph-image.tsx`, route handlers) (Pass 6 doc sync, I-11).
- Explicit return types on all exported functions.

### Next.js 16 (App Router)

- **App Router only.** Files under `apps/web/src/app/**`. No `pages/` directory.
- **Server Components by default.** Add `'use client'` only when the component uses state, effects, browser APIs, or event handlers.
- **`proxy.ts` (replaces `middleware.ts` since 16.3.4).** Next 16 renamed `middleware.ts` → `proxy.ts`; build **errors** if both exist. It runs on the Edge Runtime (`export async function proxy`) and may only import `@devlog/auth/tokens` (pure Web Crypto) — never `@devlog/auth` (which pulls better-sqlite3). Matcher `['/admin/:path*']`.
- **`output: 'standalone'`.** Build produces `apps/web/.next/standalone/apps/web/server.js`. Start with `node apps/web/.next/standalone/apps/web/server.js` (or `pnpm --filter @devlog/web start`), not `next start`. **`pnpm build` runs a `postbuild` step (R-33)** that copies `.next/static` + `public/` into the standalone folder — without it every `/_next/static/*` URL 404s and the landing page renders unstyled (that was live incident C-34).
- **`transpilePackages`** for all 5 local packages (declared in `next.config.ts`).
- **`pageExtensions: ['ts','tsx','js','jsx','md','mdx']`** — MDX is a first-class route extension.
- **MDX content** — snippets live in `apps/web/content/snippets/*.mdx`; blog posts live in the DATABASE (seeded by `packages/db/src/seed.ts`, managed via admin CRUD) and render through `renderMDX`. There is no `content/posts/` directory (Pass 6 doc sync, I-11).
- **`reactStrictMode: true`** — surfaces unsafe side effects in dev.
- **Prerendered URL-bearing surfaces revalidate hourly (R-49/R-52).** `posts/[slug]` (generateStaticParams), `/admin/login`, and the robots/rss/sitemap routes export `revalidate = 3600` — absolute URLs in prerendered HTML bake the BUILD env's `NEXT_PUBLIC_SITE_URL`, so CI builds must run with it set; hourly revalidation self-heals fresh deploys from the runtime env. Pinned by `revalidate-contract.test.ts`.
- **PPR (`experimental.cacheComponents`)** is intentionally disabled; enable in Phase 8+ once the landing page is fully built (deferred from the original Phase 4 target).

### React 19

- **No `forwardRef`.** React 19 passes `ref` as a regular prop.
- **Server Actions** for form submissions (`'use server'` in `features/*/actions.ts`). `'use server'` files may export **only async functions** (R-48, audit C-37): exporting a Zod schema object or re-exporting one makes the Server Actions loader throw at module evaluation and 500s every action in the file — invisibly to unit tests. Shared schemas live in plain modules (`@devlog/types`, `features/{feature}/schemas.ts`); `use-server-exports-scan.test.ts` enforces this.
- **`use()` hook** for unwrapping promises from Server Components — no `Suspense` boundary needed for simple cases.
- **`useFormState` / `useFormStatus`** for progressive form enhancement.

### Tailwind CSS v4 (CSS-first)

- **No `tailwind.config.ts`.** All tokens live in `@theme` blocks in `packages/config/tailwind/base.css` and `apps/web/src/app/globals.css`.
- **Theme switching via `[data-theme="dark|light|cyber"]`** on `<html>`. The mockup defines 3 themes; do not add a 4th.
- **Component classes** (`.btn-primary`, `.article-card`, `.code-window`, etc.) live in `globals.css` inside `@layer components` — port verbatim from the mockup. Do not re-implement with utility classes. The layer wrapper is **load-bearing** (R-98, audit H-44): unlayered CSS beats `@layer utilities`, so an unlayered `display` on a component class silently disables responsive display utilities (`hidden`, `sm:inline-flex`, `md:inline-block`) paired with it. `css-layer-scan.test.ts` pins the contract.
- **No arbitrary literal values** like `text-[#abc123]`. Arbitrary `var()` references (`bg-[var(--bg-elev)]`, `text-[var(--muted)]`) ARE the established as-built pattern — they reference `@theme` tokens — and are allowed (Pass 6 doc sync, I-11).
- **Mobile-first responsive.** `md:` / `lg:` modifiers build up from base mobile styles.
- **`prefers-reduced-motion`** is enforced in `globals.css` — every animation must respect it.

### Drizzle ORM

- **SQLite only.** `sqliteTable` from `drizzle-orm/sqlite-core`. No Postgres.
- **Runtime client fails fast (R-38):** the client throws an actionable error when the resolved `DATABASE_PATH` does not exist — better-sqlite3 would otherwise silently create an empty database and every DB-backed route 500s at request time (the live `/archive` + `/posts/[slug]` outage, C-36). Only `runMigrations()` (via `openDatabaseForMigrations()`) may create a fresh file.
- **SQLite dialect guardrails (R-32):** never use `::` casts in `sql` templates (PostgreSQL-only; SQLite throws `unrecognized token: ":"`) — use drizzle's `count()` helper. Never bind a `Date` into raw `sql` — convert with `postEpochSeconds()` from `@devlog/db` (epoch seconds is the stored unit). `packages/db/src/queries.test.ts` pins both against a real SQLite file.
- **Migrations via `pnpm db:generate`** (Drizzle Kit generates SQL) → `pnpm db:migrate` (applies). Never `db:push` in prod.
- **Timestamps** are `integer('...', { mode: 'timestamp' })` with `default(sql\`(unixepoch())\`)`.
- **Foreign keys** use `references(() => X.id, { onDelete: 'cascade' })`.
- **Indexes** declared inline in the second arg of `sqliteTable()`.
- **Type inference** via `typeof posts.$inferSelect` — never hand-write row types.
- **Schema lives in `packages/db/src/schema.ts`.** App code imports from `@devlog/db`, never from `drizzle-orm/sqlite-core` directly.

### Auth (homegrown — Better Auth removed, ADR-004 amendment)

- **`better-auth` is NOT a dependency anymore** (audit remediation R-2, 2026-09-03). The v1 auth surface is served entirely by `@devlog/auth`:
  - `src/tokens.ts` — edge-safe HMAC-SHA256 via **Web Crypto `crypto.subtle`** (`async`, `timingSafeEqualHex`, no `node:crypto`/`Buffer`), keyed by `BETTER_AUTH_SECRET` (env name kept for compat). Session token v2 format (R-39, 2026-09-04): `<userId>.<iat-seconds>.<hmac(userId.iat)>` — `verifySessionToken()` enforces the 30-day TTL **server-side**; legacy 2-part tokens are rejected so old sessions force a re-login. Transaction tokens for confirm/unsubscribe/preferences are unchanged. All exports `async` since 2026-09-03 (R-A).
  - `src/password.ts` — scrypt hashing (N=2^15, r=8, p=1, format `scrypt:N:r:p:salt:hash`, `timingSafeEqual`).
  - `src/index.ts` — DB-backed `signIn` / `getSession` / `requireAuthor` (role gate) / `getSessionFromCookies` (uses `next/headers`; `next` is a peerDependency).
- **Session cookie name:** `devlog_session` (exported as `SESSION_COOKIE` from `@devlog/auth/tokens`; always read it via the constant — never hardcode the string).
- **Transaction tokens (R-80, Pass 7):** confirm links are v2 `<subscriberId>.<iat>.confirm.<hmac>` with a server-enforced 7-day TTL; unsubscribe/preferences links stay long-lived v1. Verify with `verifyTransactionToken(token, id, 'confirm' | 'manage')` — purposes are separated.
- **Role enum** is `'author' | 'subscriber'` (stored on `users.role`, schema also in `@devlog/types`). `author` can access `/admin/*`; `subscriber` cannot. The guarded admin shell lives at `(auth)/admin/(dashboard)/layout.tsx` — a route group so `/admin/login` renders OUTSIDE it (R-31: the old monolithic layout caused an infinite `/admin/login` redirect loop via an `x-pathname` header sniff). The edge `proxy` only verifies the session HMAC (`await verifySessionToken`).
- **Production secret policy:** `getSecret()` throws when `BETTER_AUTH_SECRET` is missing/<32 chars in production (R-5).

### Resend + React Email

- **Templates** in `packages/email/src/templates/*.tsx` (React Email components).
- **Send wrapper** in `packages/email/src/send.ts`. Falls back gracefully when `RESEND_API_KEY` is unset (dev).
- **`RESEND_FROM`** must be `onboarding@resend.dev` in dev sandbox; a verified domain address in prod.

### Zod

- **At every boundary.** Server Action inputs, API route bodies, env vars (`apps/web/src/lib/env.ts`).
- **Schema → Type** via `z.infer<typeof Schema>`. Never duplicate types.
- **Coercion** for env numbers (`z.coerce.number().int().default(...)`).

### Zustand

- **Client-only state.** Theme store, UI store. Never use Zustand for server state.
- **No `redux`, no `react-query`** — Server Components + Server Actions handle server state.

### ESLint 9 (flat config)

- Base config in `packages/config/eslint/base.mjs`. Per-package `eslint.config.mjs` extends it.
- **`no-restricted-syntax`** blocks `as any`, `enum`, `namespace`.
- **`react-hooks` plugin** with the v7 ruleset (set-state-in-effect detection).
- **`import/no-cycle`** would be redundant — the 5-layer rule (below) supersedes it.

---

## Development Workflow

### Environment Setup

```bash
# Requires: Node ≥20, pnpm ≥9.15 (declared in package.json engines)
node --version
pnpm --version

git clone https://github.com/nordeim/programmer-blog.git
cd programmer-blog
pnpm install

cp .env.example .env.local
# Generate the two 32-byte secrets:
#   openssl rand -hex 32  → BETTER_AUTH_SECRET
#   openssl rand -hex 32  → SIGNED_TOKEN_SECRET
# RESEND_API_KEY is optional in dev (subscribe flow degrades gracefully).

pnpm db:generate   # `drizzle-kit generate --config ./drizzle.config.ts` in @devlog/db (0.31)
pnpm db:migrate    # Apply migrations (creates apps/web/devlog.db)
pnpm db:seed       # Seed mockup data (9 posts, 12 tags, 3 subscribers, 2 comments, 1 author)
# One-shot from scratch:
pnpm db:setup      # = db:generate && db:migrate && db:seed

pnpm dev           # Boots Next.js at http://localhost:3000
```

### Build Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Next.js dev server (Turbopack) |
| `pnpm build` | Production build → `apps/web/.next/standalone/apps/web/server.js` |
| `pnpm start` | `node apps/web/.next/standalone/apps/web/server.js` (or `pnpm --filter @devlog/web start`; `start:next` = `next start`) — production server (after build) |
| `pnpm check-types` | `tsc --noEmit` across all 5 packages |
| `pnpm lint` | ESLint 9 flat config across all packages |
| `pnpm lint:fix` | Auto-fix lint issues |
| `pnpm test` | Vitest across all packages |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm test:coverage` | Vitest with coverage report |
| `pnpm format` | Prettier write |
| `pnpm format:check` | Prettier check |
| `pnpm db:generate` | `drizzle-kit generate --config ./drizzle.config.ts` in `@devlog/db` (0.31) |
| `pnpm db:migrate` | Apply pending migrations (creates `apps/web/devlog.db`) |
| `pnpm db:seed` | Seed the dev DB from `packages/db/src/seed.ts` |
| `pnpm db:setup` | One-shot `generate && migrate && seed` (from-scratch init) |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm clean` | Remove `node_modules`, `.turbo`, build artifacts |
| `pnpm check` | **The full quality gate:** `check-types && lint && test:coverage && audit --prod && build` (five stages, Pass 8 doc sync R-97) |

**Single-package commands** (run from package dir):
```bash
pnpm --filter @devlog/web test
pnpm --filter @devlog/db test
pnpm --filter @devlog/web check-types
```

---

## Testing Strategy

### Test Pyramid

- **Unit** — pure functions (`packages/db/src/seed.test.ts`, `apps/web/src/lib/pagination.test.ts`).
- **Component** — React Testing Library + jsdom (`apps/web/src/components/tag.test.tsx`).
- **Route** — Server Component render tests (`apps/web/src/app/(public)/page.test.tsx`).
- **API** — Route handler integration (`apps/web/src/app/api/confirm/route.test.ts`).
- **E2E** — Manual live E2E (browser + HTTP contract checks) verified each remediation pass, 3–9; automated Playwright E2E remains deferred (Phase 8+ backlog).

### Test Commands

```bash
pnpm test                       # All packages, one-shot
pnpm --filter @devlog/web test  # Just the web app
pnpm --filter @devlog/db test   # Just the db package
pnpm test:watch                 # Watch mode (development)
pnpm test:coverage              # Coverage report
```

### Testing Conventions

- **Co-located:** `Component.tsx` ↔ `Component.test.tsx` in the same directory.
- **Vitest + jsdom** via `apps/web/vitest.config.ts` + `vitest.setup.ts`.
- **Mock hoisting:** when mocking modules with `vi.mock()`, inline the factory. Never reference outer-scope variables inside the factory — Vitest hoists `vi.mock` above imports.
- **No JSX in `.test.ts` files** — use `.test.tsx` if the test renders components.
- **Behavior over implementation.** Test what the user sees, not the internal state shape.
- **TDD order:** write the failing test → run `pnpm test` and watch it fail → write the implementation → run `pnpm test` and watch it pass → refactor.

---

## Code Quality Standards

### Linting & Formatting

```bash
pnpm lint           # ESLint 9, flat config
pnpm lint:fix       # Auto-fix
pnpm format         # Prettier write (with prettier-plugin-tailwindcss)
pnpm format:check   # Prettier check (CI gate)
```

**Lint rules that bite:**
- `no-restricted-syntax` blocks `as any`, `enum`, `namespace` (use `as const` + union types).
- `react-hooks/set-state-in-effect` (v7) — wrap deferred state changes in `setTimeout` so they don't cascade.
- `import/no-cycle` — not configured because the 5-layer rule (below) supersedes it. Dependency direction is enforced by convention and review.

### Pre-commit Hooks

- **Husky + lint-staged** run Prettier + ESLint on staged files.
- **commitlint** enforces Conventional Commits format (`feat(scope): subject` etc.). Subject lines max 72 chars.

---

## Git & Version Control

### Branching Strategy

- **Trunk-based.** All commits go to `main`. No feature branches, no PRs.
- **No `--no-ff` merges.** Linear history. Use `git rebase` if you fall behind.
- **No `git push --force` to `main`.** If a commit is wrong, push a `fix:` commit on top.

### Commit Standards

- **Conventional Commits** format: `<type>(<scope>): <subject>`.
  - Types: `feat`, `fix`, `build`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `ci`.
  - Scopes: `blog`, `admin`, `auth`, `email`, `db`, `landing`, `subscribe`, `validation`, etc.
- **Atomic commits** — one logical change per commit. If you can't summarize the change in one line, split the commit.
- **Footer `Refs: FR-N`** ties the commit to a Functional Requirement in the PRD. Example:
  ```
  feat(blog): add /rss.xml route + tests (FR-23)

  Refs: PRD FR-23; PAD §3.4
  ```
- **Each MEP phase produces 3–6 atomic commits.** Do not squash phases into a single commit.

### SSH Push (when OpenSSH is unavailable)

If `git push` fails with "Permission denied (publickey)" or `which ssh` returns nothing, use the SSH wrapper:

```bash
GIT_SSH_COMMAND="skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py -i docs/ssh-key.txt -o StrictHostKeyChecking=accept-new" git push origin main
```

The wrapper is Paramiko-based and handles the `shlex.join()` quoting bug that breaks naive SSH wrappers. See `skills/how-to-git-push-using-ssh-wrapper/SKILL.md` for full troubleshooting.

---

## Error Handling & Debugging

### Error Handling Approach

- **Server Actions** return discriminated unions: `{ ok: true, message?, data? } | { ok: false, error, fieldErrors? }` (as-built Pass 7 sync, R-94). Never throw across the network boundary.
- **API routes** return `NextResponse.json({ error: '...' }, { status: 4xx })`. Validation errors are 400, auth failures 401, not-found 404, server errors 500.
- **`error.tsx`** boundary catches route render errors. `not-found.tsx` handles 404s.
- **`apps/web/src/app/error.tsx`** must never import server-only code.

### Debugging Tools

- **`pnpm dev`** — Turbopack dev server with Fast Refresh. Most issues are HMR-related; restart if states look stale.
- **`pnpm db:studio`** — Drizzle Studio at http://localhost:4983 — inspect/modify the SQLite DB.
- **`pnpm check-types`** — first line of defense for type drift across packages.
- **Vitest UI** — `pnpm --filter @devlog/web test:watch -- --ui` for the component tree explorer.
- **`NEXT_PUBLIC_SITE_URL`** mismatch is the #1 cause of broken RSS/OG tags. Always check `apps/web/src/lib/env.ts` first.

---

## Communication & Documentation

### Documentation Standards

- **PRD/PAD/MEP triple** at repo root — the canonical engineering spec. Update when scope changes, not on every commit.
- **`Refs: FR-N`** in commit footers ties code to PRD requirements.
- **`SKILL.md`** (`programmer-blog_SKILL.md`) is the deep-dive codebase reference — anti-patterns, lessons, debug guides. Update after every sprint that fixes a bug or introduces a pattern.
- **Comment "why", not "what."** Self-documenting code is the goal; comments explain non-obvious decisions.
- **JSDoc on exported functions** — 1-line summary + `@param`/`@returns` when not obvious from types.

---

## Project-Specific Standards

### Architecture — The 5-Layer Golden Rule

A layer may only import from layers *below* it (higher-numbered) or from its own layer. **Violations are review-blocking.**

```
Layer 0: proxy (apps/web/src/proxy.ts)
         Edge Runtime. NO database access. NO @devlog/auth (only @devlog/auth/tokens).

Layer 1: app (apps/web/src/app/**)
         App Router routes + layouts. Stays thin. NO direct DB queries in route files.
         Routes call into features/ or lib/, never into packages/db directly.

Layer 2: features (apps/web/src/features/**)
         Feature-sliced modules: landing, blog, admin, auth, subscribe.
         Each owns its UI, queries, mutations, types.
         May import: domain, lib, packages/*, components, hooks.

Layer 3: domain (apps/web/src/domain/**)
         Pure types and logic. NO IO. NO React. NO Drizzle. NO better-sqlite3.
         Zod schemas, slugify, signed-token helpers, pure validators.

Layer 4: lib (apps/web/src/lib/**)
         Infrastructure adapters: db, auth, email, github, rate-limit, rss, env.
         The ONLY layer that imports drizzle-orm, better-sqlite3, resend, etc.

Packages (@devlog/db, @devlog/auth, @devlog/email, @devlog/types, @devlog/config)
         Consumed by Layer 4 (lib) — never directly by Layer 1 (app).
```

**Drizzle precision (R-46, 2026-09-04):** the as-built codebase allows app/feature files to import drizzle-orm *operators* (`eq`, `and`, `desc`, `count`) alongside `@devlog/db` query functions. The review-blocking prohibitions are: `drizzle-orm/sqlite-core` (table definitions), `better-sqlite3`, and raw client opens outside `packages/db` + `lib`; any `drizzle-orm` import in `domain/`.

### API Design

- **Route handlers** at `apps/web/src/app/api/{resource}/route.ts`. Force-dynamic when stateful, default-cacheable when static.
- **Server Actions** at `apps/web/src/features/{feature}/actions.ts`. Mark `'use server'` at the top. Export **only async functions** from those files (R-48) — schemas live in `@devlog/types` / `features/{feature}/schemas.ts`.
- **Zod** validates every input. Never read `FormData` or `Request.json()` without parsing through a schema.
- **Auth checks** before any mutation. Use `await verifySessionToken()` (async since Web Crypto) in Server Actions; `proxy.ts` handles `/admin/*` route auth.

### Database / Data Layer

- **Schema** lives in `packages/db/src/schema.ts`. **8 tables:** `users`, `sessions` (reserved — never read by the stateless HMAC auth), `posts`, `tags`, `postsToTags`, `subscribers`, `comments`, `siteSettings`.
- **Runtime client fails fast (R-38):** a missing `DATABASE_PATH` file is a hard boot error with the remedy in the message — never a silent empty database.
- **Queries** belong in `packages/db/src/queries.ts` (the boundary). Layer 1 (app) and Layer 2 (features) call queries from there, not Drizzle directly.
- **Migrations** generated by `pnpm db:generate` → committed → applied via `pnpm db:migrate`. Never `db:push` outside of throwaway dev DBs.
- **Seed** via `pnpm db:seed` populates the mockup data (9 posts, 12 tags, 3 subscribers, 2 comments, 1 author row; snippets are MDX files, not DB rows).

### Environment Variables

13 application variables (plus `NODE_ENV`, set by Next.js) — see `.env.example` for the canonical source.

| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_PATH` | SQLite file path (default `./devlog.db`; R-38: the file must exist or boot fails) | No |
| `BETTER_AUTH_SECRET` | 32-byte session cookie signing key | Yes (prod) |
| `BETTER_AUTH_URL` | Canonical site URL for auth callbacks | No (default `http://localhost:3000`) |
| `RESEND_API_KEY` | Resend API key (`re_test_...` or `re_...`) | No (dev degrades gracefully) |
| `RESEND_FROM` | From address (must be on verified Resend domain) | No (default `onboarding@resend.dev`) |
| `SIGNED_TOKEN_SECRET` | 32-byte HMAC key for subscribe/unsubscribe/preference tokens (R-62/M-46: transaction tokens are keyed by this since Pass 6; dev falls back to the session secret) | Yes (prod — throws at boot if missing, R-61) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL (RSS, OG tags, email links) | No (default `http://localhost:3000`; localhost in prod warns at boot, R-41) |
| `NEXT_PUBLIC_GITHUB_REPO` | `owner/repo` for the nav star pill | No (default `tailwindlabs/tailwindcss`) |
| `NEXT_PUBLIC_AUTHOR_EMAIL` | Author email for footer mailto | No (default `hi@devlog.example`) |
| `GITHUB_STATS_FALLBACK_STARS` | Used when GitHub API rate-limited | No (default 82400) |
| `GITHUB_STATS_FALLBACK_FORKS` | Used when GitHub API rate-limited | No (default 4180) |
| `CRON_SECRET` | Reserved for future `POST /api/cron/*` endpoints — **no cron routes exist yet** | No |
| `DEV_AUTHOR_PASSWORD` | Password for the seeded author. Dev-only override (login-page hint renders in development only, R-37). **Production seeds throw without it** (R-57/C-38); `start_server.sh` generates one automatically | No (dev) / **Yes (prod seed)** |

**Access pattern:** Never read `process.env.FOO` directly in feature code. Use `apps/web/src/lib/env.ts` (Zod-validated, throws at boot in prod). **Empty string = unset (R-73):** present-but-empty vars are normalized to absent, so the `cp .env.example .env.local` quick start boots without filling optional vars. Public vars (`NEXT_PUBLIC_*`) are inlined by Next.js and safe to read in client components.

---

## Anti-Patterns to Avoid

- **Importing `@devlog/auth` (root) in `proxy.ts`.** It pulls `better-sqlite3` + Drizzle, which break the Edge Runtime. Import `@devlog/auth/tokens` instead (pure `crypto.subtle`, async).
- **Reading `process.env.*` directly in feature/components.** Always go through `apps/web/src/lib/env.ts`.
- **Using `enum` or `namespace`.** `erasableSyntaxOnly: true` forbids them. Use `as const` objects + union types.
- **Using `as any`.** Lint blocks it. Use `unknown` + narrow, or `satisfies`.
- **Default exports in `apps/web/src/**`.** Use named exports only — except the files Next.js requires to default-export (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `manifest.ts`, `opengraph-image.tsx`, route handlers).
- **Adding a 4th theme.** The mockup defines dark/light/cyber — the design budget is closed.
- **Importing `drizzle-orm` in Layer 1 (app) or Layer 2 (features) beyond operators.** `drizzle-orm` operators (`eq`, `and`, `desc`, `count`) alongside `@devlog/db` queries are the as-built R-46 pattern — allowed in app/features. Still forbidden outside `packages/db` + `lib`: `drizzle-orm/sqlite-core` table definitions, `better-sqlite3`, and raw client opens; any `drizzle-orm` import in `domain/`.
- **`pnpm db:push` in production.** Always `db:generate` → review SQL → `db:migrate`.
- **Framer Motion / GSAP.** CSS-only animation is the rule. Lighthouse ≥95 is the design budget (local-build metric — see Pass 9, M-59).
- **Arbitrary Tailwind values (`text-[#abc]`).** Use the design token or extend `@theme`.
- **Skipping the failing test.** TDD order is non-negotiable: RED → GREEN → REFACTOR.
- **Exporting non-async values from `'use server'` files.** Review-blocking since C-37 (all six mutations 500-ed in production). The scan test fails the suite.

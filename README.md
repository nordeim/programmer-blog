# `/dev/log` — Notes from a Programmer's Desk

[![Built with Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Tests: 459](https://img.shields.io/badge/tests-459-6ead2a?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: Proprietary](https://img.shields.io/badge/license-Proprietary-red)](#license)

> Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am.
> By Alex Rivera. New essay every other Tuesday.

A production-grade programmer blog built as a pnpm + Turborepo monorepo: **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4** (CSS-first `@theme`), **Drizzle ORM** + **better-sqlite3**, homegrown **HMAC-SHA256 + scrypt auth** (`@devlog/auth`, ADR-004 amendment), **Resend** + **React Email**, and **Vitest**. The dynamic landing page reproduces `landing_page_mockup.html` pixel-for-pixel across dark / light / cyber themes.

The architecture enforces a strict 5-layer golden rule, TDD (Red→Green→Refactor), trunk-based development on `main` with Conventional Commits, and a Zod-validated env layer that fails fast at boot.

## Table of Contents

- [Engineering Documents](#engineering-documents)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Layout](#repository-layout)
- [Quick Start](#quick-start)
- [Production Start Script (Fresh Clone)](#production-start-script-fresh-clone)
- [Environment Variables](#environment-variables)
- [Routes Implemented](#routes-implemented)
- [Testing](#testing)
- [Validation Status](#validation-status)
- [The Golden Rule](#the-golden-rule)
- [Commit Conventions](#commit-conventions)
- [Contributing](#contributing)
- [Project Status](#project-status)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Engineering Documents

The repo ships with a triple-spec engineering baseline plus a post-build audit and remediation plan. Read these before touching code:

- [`Project_Requirements_Document.md`](./Project_Requirements_Document.md) — **PRD v1.1**. The *what* and *why*. Defines 60+ functional requirements (FR-1 through FR-60) traced to mockup elements. Revision block v1.1 records the audit-driven amendments.
- [`Project_Architecture_Document.md`](./Project_Architecture_Document.md) — **PAD**. The *how*. 7 ADRs, the 5-layer golden rule, annotated directory tree, security architecture, testing strategy.
- [`Master_Execution_Plan.md`](./Master_Execution_Plan.md) — **MEP v1.2**. The *in what order*. 9 build phases + Phase 9 (audit remediation) + Phase 9.5 (second remediation pass), each with a file manifest, a TDD RED→GREEN→REFACTOR checklist, and an acceptance gate.
- [`CODE_REVIEW_AUDIT_REPORT.md`](./CODE_REVIEW_AUDIT_REPORT.md) — **Audit report**. 5-phase deep audit: lint/types → security → quality (12 categories) → tests → spec alignment. 9 Critical / 30 High / 24 Medium / 16 Low findings, each with file:line, PRD clause breached, and remediation pointer. Includes a re-audit delta showing resolution status.
- [`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md) — **Remediation plan**. 29 TDD-sequenced tasks (R-1 to R-29) across 5 phases (P1 security, P2 functional, P3 alignment, P4 quality, P5 docs). Each task has RED test, GREEN implementation, REFACTOR step, and acceptance gate.
- [`CLAUDE.md`](./CLAUDE.md) — Project-wide conventions for coding agents (Meticulous Approach, TypeScript strictness, env vars).
- [`AGENTS.md`](./AGENTS.md) — Compact, high-signal instructions for AI coding agents (commands, layer rules, gotchas).
- [`programmer-blog_SKILL.md`](./programmer-blog_SKILL.md) — Deep-dive codebase distillation: 20-section reference with anti-patterns, debugging guide, design tokens, and TypeScript interfaces.

## Audit Status

The codebase has passed a full 5-phase code review and security audit (per the `code-review-and-audit` skill, `deep` mode) **plus a second remediation pass that closed every deferred task**:

- **Pass 1** (commit `9a83202`): resolved all 9 Critical findings and the highest-impact High findings (password scrypt hashing, signed confirm tokens, prod secret enforcement, admin role gate, dependency bumps).
- **Pass 2** (see `Master_Execution_Plan.md` §13 "Phase 9.5"): removed `better-auth` entirely (ADR-004 amendment — homegrown HMAC-SHA256 + scrypt, now dependency-free), self-hosted fonts via `next/font/local` (132KB, zero Google Fonts requests), dynamic OG images via `next/og` (site + per-post), favicon + web manifest, populated `@devlog/types` (shared Zod schemas + markdown-aware reading time), replaced the test cookie backdoor with `next/headers`, and ~80 new tests.

The `pnpm check` script enforces types, lint, test:coverage, and `pnpm audit --prod` as gates:

```bash
pnpm check  # types + lint + coverage + audit + build, all must pass
```

Current audit posture: **0 vulnerabilities** in `pnpm audit --prod` — 0 critical, 0 high, 0 moderate, 0 low (down from 50 total / 3 critical / 18 high at audit time). Coverage: ~65% lines (up from 44.43%) against staged thresholds; the original 80/75/80/80 target is tracked as backlog item R-30 in `REMEDIATION_PLAN.md` (admin form suite + blog components still untested).

**Pass 3 (2026-09-03, post-deployment):** browser E2E against the live site caught four Critical regressions the unit suite could not see — the `/admin/login` redirect loop (C-31), PostgreSQL-only `::int` casts + `Date` binds 500-ing `/archive` and `/posts/[slug]` (C-32/C-33/H-33), and the standalone deploy serving an unstyled landing page because `.next/static` was never copied (C-34). All fixed via R-31..R-34 (see `REMEDIATION_PLAN.md` §8 Pass 3) with the first real-SQLite integration suite for the query layer; full evidence in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 3" addendum.

**Pass 4 (2026-09-04, live E2E re-audit):** a second browser E2E + security review (`code-review-and-audit` deep mode) found the production deployment silently booting against an **empty database** — better-sqlite3 auto-creates a missing `devlog.db`, so `/archive` and `/posts/[slug]` 500-ed while the landing page (hardcoded mockup fallbacks) masked the outage (C-36) — and the production login page **publicly printing the seeded dev credentials** with no environment gating (C-35). Both are fixed (R-38 fail-fast DB client, R-37 env-gated hint), alongside server-side session expiry (R-39), real-IP rate limiting for comments/subscribe (R-40), a localhost-URL boot warning (R-41), CSV formula-injection guard (R-45), JSON-LD script escaping (R-44), and a GitHub fetch timeout (R-43). Full findings, evidence and E2E table in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 4 Addendum"; tasks in `REMEDIATION_PLAN.md` §10. The deployment itself still requires the operator to set an absolute `DATABASE_PATH`, run migrations + seed, and set `NEXT_PUBLIC_SITE_URL` — see the checklist below.

**Pass 5 (2026-09-04, live E2E verification of the remediated deployment):** with a working seeded database on the live site, a fresh browser E2E verified every Pass 4 fix (C-31/C-35/C-36/R-34 hold) and uncovered **C-37** — every Server Action mutation (`createComment`, `createPost`, `updatePost`, `deletePost`, `moderateComment`, `updateSiteSettings`) 500-ed in production because `'use server'` files exported Zod schema objects, which Next.js 16 forbids (module-evaluation throw invisible to the unit suite). Fixed in R-48 (schemas moved to plain modules + a source-scan regression test), alongside real tags in the archive (R-50/R-51), a tags-in-use filter dropdown, hourly revalidation for prerendered URL-bearing surfaces so canonical/OG URLs stop advertising the build machine's localhost (R-49/R-52), a mobile grid-blowout fix landed mockup-first (R-53), single-`<h1>` post pages (R-54), and calmer unsubscribe error copy (R-55). Full findings, evidence and the live E2E table in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 5 Addendum"; tasks in `REMEDIATION_PLAN.md` §11.

**Pass 7 (2026-09-04, tiered review + security audit + live E2E):** the third full `code-review-and-audit` deep pass plus a fresh browser E2E verified every Pass 3–6 fix still holds, then found **C-41** — the tracked `.env.local.example` file carried the production-faithful secret set (session/token HMAC secrets, a filled author password, the real deployment host) under a `.example` name (placeholders now; mandatory operator rotation recorded) — and **H-40**, where present-but-empty env vars (`RESEND_API_KEY=` from the documented quick start) crashed every production build (fixed in R-73: empty = unset). Also fixed: the unsubscribe page performed its destructive DB write during the GET render, so email prefetchers could silently unsubscribe users (H-42 → POST-only via a `confirmUnsubscribe` Server Action); transaction tokens gained a purpose-tagged 7-day TTL on confirm links (M-54); the live `robots.txt` advertised a stale localhost sitemap URL from a 24h CDN cache pinned by the route's own `s-maxage=86400` (M-49 → hourly, live-verified via cache-bust A/B); rate-limit keys took the attacker-set first `X-Forwarded-For` entry (M-50 → rightmost hop); the subscribe form threw `TypeError: null currentTarget` after `await` on every success (M-51, React 19); `/archive` + `/snippets` inherited the homepage canonical (M-52); the hero mouse-glow was dead code attached to a `pointer-events: none` overlay (M-53); CSP gained `base-uri`/`object-src`/`form-action` (M-55); plus a unique post-tag index (L-45), `updatePost` invariants (L-46), a CSV tab/CR guard (L-47), query guards (L-48), a scoped comments-page query (L-49), site-relative `rssUrl` acceptance (L-50), email sandbox-key handling (L-51), a typewriter tab-visibility resume (L-52), Tailwind literal cleanup (L-53), and operator-hygiene fixes (L-54/L-55). Full findings and evidence in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 7 Addendum"; tasks in `REMEDIATION_PLAN.md` §13.

**Pass 6 (2026-09-04, tiered code review + security audit):** a full `code-review-and-audit` deep pass (static analysis → OWASP security scan → 12-category quality checklist → tests → expert review) plus a fresh live E2E verified every Pass 3–5 fix still holds, then found **C-38** — the production seed path (`bash start_server.sh` → `pnpm db:seed`) created the author account with the publicly-known `dev-password-12345` fallback (fixed in R-57: the seed now refuses to seed prod without `DEV_AUTHOR_PASSWORD`, and the start script generates a strong random one) — and **H-39**, a Server-Action argument (`ctx.ip`) that let callers spoof the rate-limit key (fixed in R-58: the IP is read from proxy headers only). Also fixed: unbounded rate-limit store growth (R-59), an open redirect on `/admin/login?next=` for signed-in authors (R-60), boot-time enforcement of missing production secrets (R-61), `SIGNED_TOKEN_SECRET` actually keying transaction tokens per the documented contract (R-62), two 5-layer golden-rule violations + a new layer-boundary scan test (R-63), double `<h1>` on snippet pages (R-64), http(s)-only social URLs (R-65), wildcard-safe search on the live `?q=` path (R-66), and several Low/info cleanups (R-67..R-69). And a third Critical, **C-40**: a force-added `.env.local` tracked real secrets in the public repo — untracked in R-71, with **mandatory operator rotation** of `BETTER_AUTH_SECRET`/`SIGNED_TOKEN_SECRET`/`DEV_AUTHOR_PASSWORD` (the committed session key enables admin-cookie forgery on the live site until rotated). The committed SSH key remains an explicit operator workflow (risk-accepted with rotation/deploy-key follow-ups). Full evidence in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 6 Addendum"; tasks in `REMEDIATION_PLAN.md` §12.

## Tech Stack

| Layer | Technology | Version | Critical Note |
|---|---|---|---|
| Package manager | pnpm | `9.15.4` | Never `npm` or `yarn`. Workspace via `pnpm-workspace.yaml`. |
| Monorepo | Turborepo | `^2.4.0` | `turbo.json` declares `globalEnv` for env-aware caching. |
| Web framework | Next.js (App Router) | `^16.3.4` | `output: 'standalone'` → `apps/web/.next/standalone/apps/web/server.js`; `proxy.ts` (replaces `middleware.ts` since 16.3.4). |
| UI runtime | React | `^19.0` | No `forwardRef` — `ref` is a regular prop. |
| Language | TypeScript | `^5.9.0` | `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (forbids `enum`/`namespace`). |
| Styling | Tailwind CSS | v4 (CSS-first `@theme`) | No `tailwind.config.ts`. Tokens in `globals.css` + `packages/config/tailwind/base.css`. |
| ORM | drizzle-orm | `^0.45.2` | SQLite-only; migrations via `drizzle-kit ^0.31`. |
| Database | better-sqlite3 | `^12.11.1` | Single file at `apps/web/devlog.db`. No Postgres. |
| Auth | @devlog/auth (homegrown) | — | HMAC-SHA256 via Web Crypto `crypto.subtle` (`async`, no `node:crypto`) + scrypt. Better Auth removed R-2. |
| Email | Resend + React Email | `^4.8.0` / `^3` | Degrades gracefully without `RESEND_API_KEY` in dev. |
| Validation | Zod | `^3.25.76` | At every boundary: Server Action inputs, env vars, API bodies. |
| Client state | Zustand | `^5.0.15` | Theme + UI stores. Never for server state. |
| Linter | ESLint | `9.39.5` (flat) | `no-restricted-syntax` blocks `as any`/`enum`/`namespace`. |
| Test runner | Vitest + jsdom | `^3.2.7` / `^25` | Co-located tests: `Foo.tsx` ↔ `Foo.test.tsx`. |
| Content | MDX | — | Snippets in `apps/web/content/snippets/*.mdx`; posts live in SQLite and render via MDX. |

## Architecture

```mermaid
flowchart TB
    subgraph Edge["Edge Runtime (Layer 0)"]
        MW[proxy.ts<br/>admin auth guard (Web Crypto)]
    end

    subgraph App["App Router (Layer 1)"]
        PUB[(public) routes]
        AUTH[(auth) routes]
        API[api/confirm, api/github-stats<br/>api/rss.xml, api/sitemap.xml]
    end

    subgraph Features["Feature Modules (Layer 2)"]
        F1[landing]
        F2[blog]
        F3[admin]
        F4[auth]
        F5[subscribe]
    end

    subgraph Domain["Domain (Layer 3) — pure TS, no IO"]
        D1[Zod schemas<br/>signed-token<br/>slugify]
    end

    subgraph Lib["Infrastructure Adapters (Layer 4)"]
        L1[db.ts]
        L2[auth.ts]
        L3[email.ts]
        L4[github.ts]
        L5[rate-limit.ts]
        L6[rss.ts]
        L7[env.ts]
    end

    subgraph Packages["@devlog/* packages"]
        P1[db — Drizzle schema]
        P2[auth — homegrown HMAC (Web Crypto) + scrypt]
        P3[email — Resend + templates]
        P4[types — shared Zod]
        P5[config — ESLint/TS/Tailwind bases]
    end

    MW --> P2
    PUB --> F1 & F2
    AUTH --> F3
    API --> F2 & F5
    F1 & F2 & F3 & F4 & F5 --> D1
    F1 & F2 & F3 & F4 & F5 --> L1 & L2 & L3 & L4 & L5 & L6 & L7
    L1 --> P1
    L2 --> P2
    L3 --> P3
    L1 & L2 --> P4
```

**Architectural principles:**
1. **5-layer golden rule** — a layer may only import from layers *below* it or its own layer. Violations are review-blocking.
2. **TDD mandatory** — Red → Green → Refactor. No production code without a failing test first.
3. **Trunk-based on `main`** — no feature branches, no PRs. Atomic Conventional Commits with `Refs: FR-N` footers.
4. **Edge-safe auth split** — `@devlog/auth/tokens` is pure Web Crypto `crypto.subtle` (`async`, no `node:crypto`/`Buffer`) so `proxy.ts` Edge can import it.
5. **CSS-only animation** — no Framer Motion, no GSAP. Lighthouse ≥95 is the design budget.
6. **Zod at every boundary** — env vars, Server Action inputs, API bodies, form data.
7. **`landing_page_mockup.html` is the source of truth** — `globals.css` is a 1:1 port. Modify the mockup first, then propagate to CSS.

## Repository Layout

```
programmer-blog/
├── apps/web/                          # The Next.js 16 app
│   ├── src/
│   │   ├── app/                       # App Router (public/auth route groups + api/)
│   │   ├── features/                  # Feature modules: landing, blog, admin, auth, subscribe
│   │   ├── domain/                    # Pure TS: theme.ts, github.ts (Zod + signed-token helpers)
│   │   ├── lib/                       # Infrastructure adapters: db, auth, email, github, rss, env
│   │   ├── components/                # shadcn-style primitives: tag, copy-button, hover-link, code-window
│   │   ├── hooks/                     # useTypewriter, useTheme, useMouseGlow, useReveal, etc.
│   │   ├── stores/                    # Zustand stores: theme-store, ui-store
│   │   └── __mocks__/server-only.ts   # Vitest mock for server-only imports
│   ├── content/                       # MDX snippets (posts live in SQLite, seeded/admin-managed)
│   ├── proxy.ts                       # Layer 0: admin route guard (Edge, Web Crypto) — replaces middleware.ts since 16.3.4
│   ├── next.config.ts                 # Security headers, transpilePackages, MDX, standalone → .next/standalone/apps/web/server.js
│   ├── vitest.config.ts               # Vitest + jsdom
│   └── postcss.config.mjs
├── packages/
│   ├── db/                            # Drizzle schema + client + migrations + seed
│   ├── auth/                          # Homegrown HMAC auth (Web Crypto tokens.ts + scrypt password.ts) — Better Auth removed (ADR-004 amendment)
│   ├── email/                         # React Email templates + Resend wrapper
│   ├── types/                         # Shared Zod schemas + TS types
│   └── config/                       # Shared ESLint, TS, Tailwind config bases
├── docs/                              # Operating instructions, SSH key, prompts
├── skills/                           # Reference skills (READ-ONLY — do not modify)
├── landing_page_mockup.html          # Source of truth for the landing page (DO NOT MODIFY)
├── CLAUDE.md                          # Coding agent conventions (Meticulous Approach)
├── AGENTS.md                          # Compact high-signal agent instructions
├── programmer-blog_SKILL.md          # 20-section codebase distillation
├── Project_Requirements_Document.md  # PRD — 60+ functional requirements
├── Project_Architecture_Document.md  # PAD — 7 ADRs, golden rule, security
├── Master_Execution_Plan.md          # MEP — 8-phase TDD roadmap
├── package.json                       # Workspace manifest
├── pnpm-workspace.yaml               # `apps/*` + `packages/*`
├── turbo.json                         # Task graph + env-aware caching
└── tsconfig.base.json                 # Strict TS, path aliases, erasableSyntaxOnly
```

## Quick Start

**Requirements:** Node.js ≥20, pnpm ≥9.15. Verify with `node --version && pnpm --version`.

```bash
# 1. Clone
git clone https://github.com/nordeim/programmer-blog.git
cd programmer-blog

# 2. Install (uses pnpm — never npm/yarn)
pnpm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local and fill in the two required secrets:
#   BETTER_AUTH_SECRET:   openssl rand -hex 32
#   SIGNED_TOKEN_SECRET:  openssl rand -hex 32
# RESEND_API_KEY is optional in dev — subscribe flow degrades gracefully without it.

# 4. Database (first run only) — one-shot alternative:
# pnpm db:setup  # = generate && migrate && seed
pnpm db:generate   # drizzle-kit generate --config ./drizzle.config.ts (0.31)
pnpm db:migrate     # Apply migrations (creates apps/web/devlog.db)
pnpm db:seed        # Seed mockup data (9 posts, 12 tags, 3 subscribers, 2 comments, 1 author)

# 5. Run
pnpm dev           # Boots Next.js at http://localhost:3000

# 6. Verify the full quality gate
pnpm check         # = check-types && lint && test:coverage && audit --prod && build
# Production start (standalone): pnpm start → node apps/web/.next/standalone/apps/web/server.js
```

> **One-command alternative (fresh clone → prod):** `bash start_server.sh` — handles `.env.local` (absolute `DATABASE_PATH`, ≥32 secrets, prod URL), `pnpm install`, `db:migrate+seed`, gate+build, standalone start with correct `bash set -a; .` sourcing, health check. See [Production Start Script (Fresh Clone)](#production-start-script-fresh-clone).

### Verify Setup

| Step | Expected output |
|---|---|
| `pnpm check-types` | `0 errors` across all 5 packages |
| `pnpm lint` | `0 errors` (0 warnings) |
| `pnpm test` | `459 tests passing` across all packages |
| `pnpm build` | Standalone build at `apps/web/.next/standalone/` (27 routes) |
| `pnpm dev` → http://localhost:3000 | Landing page with dark theme + typewriter + marquee |

## Production Start Script (Fresh Clone)

One idempotent command for a freshly `git clone`d repo (no `node_modules`, no `devlog.db`, no `.env.local`) that brings the standalone server up on `https://programmer-blog.jesspete.shop`.

```bash
bash start_server.sh          # from repo root (or ./start_server.sh)
```

**What it does (in order):**
1. **Env** — creates/validates `.env.local` (absolute `DATABASE_PATH=/…/apps/web/devlog.db`, `BETTER_AUTH_SECRET`/`SIGNED_TOKEN_SECRET` ≥32 via `openssl rand -hex 32`, `NEXT_PUBLIC_SITE_URL`/`BETTER_AUTH_URL` → prod) and syncs `apps/web/.env.local` so `next build` bakes the prod URL.
2. **Deps** — `pnpm install --frozen-lockfile`.
3. **DB** — `pnpm db:migrate` + `pnpm db:seed` (9 posts / 12 tags; fail-fast if `DATABASE_PATH` missing — R-38).
4. **Gate** — `pnpm check-types` + `pnpm lint` + `pnpm test` (360 tests, must be green).
5. **Build** — `pnpm build` (`standalone` + `postbuild` static copy) with prod env exported.
6. **Start** — kills prior `:3000` (`fuser`/`lsof`/`pkill`), then `bash -c 'set -a; . .env.local; nohup node apps/web/.next/standalone/apps/web/server.js > server.log 2>&1 & echo $! > server.pid'` (uses `bash` `set -a; .` — `dash`/`sh` `source` → `source: not found`).
7. **Health check** — `GET /archive` 200 (9 essays, tags), `GET /posts/<slug>` 200 single `<h1>` + `canonical https://…`, `GET /rss.xml` 9 `<item>`, `GET /sitemap.xml` 17 `<loc> https://…`, `GET /robots.txt` `Sitemap: https://…`, `GET /admin` 307, `canonical` prod.

**Logs / PID / Stop:**
- `server.log` (also `*.log` gitignored) — `tail -f server.log`
- `server.pid` — `kill $(cat server.pid)` or `fuser -k 3000/tcp`
- Re-runnable/idempotent — safe to run again; also handles existing `.env.local`/DB/`node_modules`.

## Environment Variables

13 application variables (plus `NODE_ENV`, set by Next.js). See `.env.example` for the canonical source.

### Server-side (read via `apps/web/src/lib/env.ts` — Zod-validated)

| Variable | Purpose | Required in prod | Default |
|---|---|---|---|
| `DATABASE_PATH` | SQLite file path. R-38: the file **must exist** or boot fails with an actionable error (no silent empty-DB creation) | No | `./devlog.db` |
| `BETTER_AUTH_SECRET` | 32-byte session cookie signing key | **Yes** | — |
| `BETTER_AUTH_URL` | Canonical site URL for auth callbacks | No | `http://localhost:3000` |
| `RESEND_API_KEY` | Resend API key (`re_test_...` or `re_...`) | No (degrades gracefully) | — |
| `RESEND_FROM` | From address (must be on verified Resend domain) | No | `onboarding@resend.dev` |
| `SIGNED_TOKEN_SECRET` | 32-byte HMAC key for subscribe/unsubscribe/preference tokens (R-62: transaction tokens are keyed by this since Pass 6) | **Yes** (throws at boot if missing, R-61) | — |
| `GITHUB_STATS_FALLBACK_STARS` | Used when GitHub API rate-limited | No | `82400` |
| `GITHUB_STATS_FALLBACK_FORKS` | Used when GitHub API rate-limited | No | `4180` |
| `CRON_SECRET` | **Reserved** — no cron routes exist yet | No | — |
| `DEV_AUTHOR_PASSWORD` | Password for the seeded author (login-page hint renders in development only, R-37). **Production seeds throw without it or under 16 chars** (R-57 + R-92); `start_server.sh` generates a strong random one automatically | No (dev) / **Yes (prod seed)** | — |

### Public (inlined by Next.js, safe in client components)

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for RSS, OG tags, email links. A localhost value in production triggers a loud boot warning (R-41) | `http://localhost:3000` |
| `NEXT_PUBLIC_GITHUB_REPO` | `owner/repo` for the nav star pill | `tailwindlabs/tailwindcss` |
| `NEXT_PUBLIC_AUTHOR_EMAIL` | Author email for footer mailto link | `hi@devlog.example` |

**Access pattern:** Never read `process.env.FOO` directly in feature/component code. Always go through `apps/web/src/lib/env.ts`. **Empty string = unset (R-73, Pass 7):** present-but-empty vars are normalized to absent, so the documented `cp .env.example .env.local` quick start builds cleanly with only the two secrets filled. Public vars (`NEXT_PUBLIC_*`) are inlined by Next.js and safe to read in client components.

## Routes Implemented

### Public

| Route | Type | Description |
|---|---|---|
| `/` | Public | Dynamic landing page (Hero, Marquee, RecentNotes, SnippetShowcase, ArchivePreview, SubscribeSection) |
| `/archive` | Public | Paginated post listing with tag filter + search |
| `/archive/page/[page]` | Public | Alternative paginated URL for SEO |
| `/posts/[slug]` | Public | Post from the DB (seeded/admin-managed), rendered via MDX, with comments + prev/next |
| `/snippets` | Public | Snippet index |
| `/snippets/[slug]` | Public | Single snippet |
| `/rss.xml` | Public | RSS 2.0 feed (rewrite → `/api/rss.xml`, R-34) |
| `/sitemap.xml` | Public | Sitemap (rewrite → `/api/sitemap.xml`, R-34) |
| `/robots.txt` | Public | Robots (rewrite → `/api/robots.txt`, R-34) |
| `/unsubscribe` | Public | Token-verified unsubscribe page — GET renders a confirmation form; the write happens via the `confirmUnsubscribe` Server Action (R-74: email-prefetch-safe) |
| `/preferences` | Public | Subscriber preferences |
| `/api/confirm` | Public | Subscribe token verification |
| `/api/github-stats` | Public | Cached GitHub stats (60s TTL) |
| `/api/rss.xml` | Public | RSS 2.0 feed route |
| `/api/sitemap.xml` | Public | Sitemap route |
| `/api/robots.txt` | Public | Robots route |

### Auth (gated by `proxy.ts` Web Crypto)

| Route | Description |
|---|---|
| `/admin/login` | Login form (route group: renders OUTSIDE the guarded shell — R-31) |
| `/admin` | Dashboard with 4 stat cards |
| `/admin/posts` | Posts list + editor |
| `/admin/posts/new` | New post editor |
| `/admin/posts/[id]` | Edit existing post |
| `/admin/subscribers` | Subscriber list + CSV export |
| `/admin/subscribers/export` | CSV export endpoint |
| `/admin/comments` | Comment moderation queue |
| `/admin/settings` | Site settings form |

**Admin shell note (R-31):** the guarded sidebar layout lives at `src/app/(auth)/admin/(dashboard)/layout.tsx` — a route group that wraps every `/admin/*` page EXCEPT `/admin/login` (which sits outside the group and renders without the shell). URLs are unchanged; the role gate (`requireAuthor`) lives in the `(dashboard)` layout.

## Testing

The test suite is co-located with source (`Foo.tsx` ↔ `Foo.test.tsx`) and runs across all 5 packages via `turbo run test`.

### Test Commands

```bash
pnpm test                       # All packages, one-shot
pnpm --filter @devlog/web test  # Just the web app
pnpm --filter @devlog/db test   # Just the db package
pnpm test:watch                 # Watch mode (dev)
pnpm test:coverage              # Coverage report
```

### Test Pyramid

- **Unit** — pure functions (`packages/db/src/seed.test.ts`, `apps/web/src/lib/pagination.test.ts`).
- **Component** — React Testing Library + jsdom (`apps/web/src/components/tag.test.tsx`).
- **Route** — Server Component render tests (`apps/web/src/app/(public)/page.test.tsx`).
- **API** — Route handler integration (`apps/web/src/app/api/confirm/route.test.ts`).
- **E2E** — Not in scope for Phases 1–7. Will be added via Playwright in a future phase.

### TDD Flow

Every code change follows **Red → Green → Refactor**:

1. Write the failing test. Run `pnpm test` and watch it fail.
2. Write the minimum implementation to make the test pass. Run `pnpm test` and watch it pass.
3. Refactor with the safety net green. Run `pnpm check-types && pnpm lint` to catch regressions.
4. Commit atomically with `Refs: FR-N` footer.

## Validation Status

- ✅ `pnpm check-types` — 0 errors across all 5 packages
- ✅ `pnpm lint` — 0 errors, 0 warnings
- ✅ `pnpm test` — 459 tests passing across all packages (355 web / 41 db / 37 auth / 21 types / 5 email)
- ✅ `pnpm test:coverage` — ~65% lines vs staged regression thresholds (80% target tracked as R-30)
- ✅ `pnpm build` — 27 routes (16.3.4), `postbuild` copies `.next/static` + `public/` into `.next/standalone/` (R-33) — `proxy.ts` Edge, Web Crypto, no `node:crypto` warning
- ✅ `pnpm audit --prod` — **0 vulnerabilities** (`pnpm.overrides` via `pnpm-workspace.yaml` + `package.json`; `pnpm` field warning accepted on 9.15.4)

### Production deploy (standalone) — R-33 + Pass 4

Next.js `output: 'standalone'` bakes the server bundle into `.next/standalone/` but leaves the client assets (`.next/static`) and `public/` **out** of it — copying them in is the operator's deploy step. The repo automates it: `pnpm build` now triggers `postbuild` (`src/scripts/copy-standalone-assets.ts`), which mirrors `.next/static → .next/standalone/apps/web/.next/static` and `public/ → .next/standalone/apps/web/public` so `pnpm build && pnpm start` always serves a complete, styled app. Skipping this step is what left the production landing page unstyled (all `/_next/static/*` 404s — audit C-34). Or run `bash start_server.sh` for the full fresh-clone flow (env + DB + gate + build + standalone) — see [Production Start Script (Fresh Clone)](#production-start-script-fresh-clone).

### Production deployment checklist — Pass 4 (R-47)

The database is **runtime data, not a build artifact** — whatever database the server ends up with (a stale build snapshot, an empty auto-created file, or the real seeded one) decides whether content routes work, and the landing page (hardcoded mockup fallbacks) cannot tell you which. A deployment that skips these steps serves a styled landing page while `/archive`, `/posts/[slug]`, RSS items and the admin login silently fail:

1. **Database file:** set `DATABASE_PATH` to an **absolute path** (CWD-relative `./devlog.db` is the trap — the standalone `server.js` runs `process.chdir(__dirname)`, so a relative path resolves inside the standalone folder, not `apps/web/`), then run `pnpm db:migrate && pnpm db:seed` against that file. Note: Next.js output-file-tracing snapshots any DB file opened at build time into the standalone output — that snapshot is stale the moment the build finishes, so an explicit absolute `DATABASE_PATH` is always the right answer. Since R-38, booting without the file fails fast with a message naming the path and the remedy — instead of silently creating an empty database (the C-36 outage).
2. **Secrets:** set `BETTER_AUTH_SECRET` and `SIGNED_TOKEN_SECRET` (32+ chars each) — boot throws without them (R-5).
3. **Site URL (build AND runtime):** set `NEXT_PUBLIC_SITE_URL=https://your-domain.com` — a localhost value in production warns at boot (R-41) and advertises `http://localhost:3000` in robots.txt, RSS, sitemap and canonical/OG tags. **The CI/build step must also run with this variable set** (Pass 5, H-37): prerendered HTML bakes the build-time value into canonical/OG tags, and the hourly revalidation (R-49/R-52) is only the self-heal backstop, not a substitute.
4. **Credentials hygiene:** the seeded author password defaults to a documented constant in dev; the login-page credentials hint renders **only** when `NODE_ENV=development` (R-37). Since R-57 (Pass 6, C-38), seeding a production database **without** `DEV_AUTHOR_PASSWORD` throws instead of silently using the public dev default — `start_server.sh` generates a strong random password and prints it once. Rotate immediately if a pre-R-57 deploy ever used the default.
5. **Verify before considering the deploy live:** `GET /archive` → 200, `GET /posts/<slug>` → 200, `GET /rss.xml` contains `<item>`s, `GET /sitemap.xml` lists post URLs, `GET /admin` redirects to `/admin/login`. A green landing page alone proves nothing (audit lesson, Passes 3–4).

## The Golden Rule

A layer may only import from layers *below* it (higher-numbered) or from its own layer. Violations are review-blocking.

```
Layer 0: proxy    — Edge `proxy.ts` (`export async function proxy`). NO database access.
                    Imports only `@devlog/auth/tokens` (Web Crypto `crypto.subtle`, `async`).
Layer 1: app      — App Router. Stays thin. NO direct database queries in route files.
                    Routes call into features/ or lib/, never into packages/db directly.
Layer 2: features — Feature modules. Each owns its UI, queries, mutations, types.
                    May import: domain, lib, packages/*, components, hooks.
Layer 3: domain   — Pure types and logic. NO IO. NO React. NO Drizzle. NO better-sqlite3.
                    Zod schemas, slugify, signed-token helpers, pure validators.
Layer 4: lib      — Infrastructure adapters (db, auth, email, github, rate-limit, rss, env).
                    The ONLY layer that imports drizzle-orm, better-sqlite3, resend, etc.
```

**Drizzle precision (R-46):** app/feature files may import drizzle-orm *operators* (`eq`, `and`, `desc`, `count`) and `@devlog/db` query functions — the as-built pattern. Still review-blocking outside `packages/db` + `lib`: `drizzle-orm/sqlite-core` table definitions, `better-sqlite3`, and raw client opens.

See `Project_Architecture_Document.md` §3 for the full annotated directory tree and the dependency-cruiser configuration (planned for Phase 8+).

## Commit Conventions

- **Trunk-based.** All commits to `main`. No feature branches, no PRs.
- **Conventional Commits** format: `<type>(<scope>): <subject>` (subject ≤72 chars).
  - Types: `feat`, `fix`, `build`, `chore`, `docs`, `refactor`, `test`, `perf`, `style`, `ci`.
  - Scopes: `blog`, `admin`, `auth`, `email`, `db`, `landing`, `subscribe`, `validation`, etc.
- **Atomic commits** — one logical change per commit. If you can't summarize in one line, split it.
- **Footer `Refs: FR-N`** ties the commit to a Functional Requirement in the PRD. Example:
  ```
  feat(blog): add /rss.xml route + tests (FR-23)

  Refs: PRD FR-23; PAD §3.4
  ```
- **Each MEP phase produces 3–6 atomic commits.** Do not squash phases into a single commit.
- **No `git push --force` to `main`.** If a commit is wrong, push a `fix:` commit on top.

## Contributing

This is a proprietary project and does not accept external contributions. Internal development follows these conventions:

### TDD (Red → Green → Refactor)

Every code change starts with a failing test. See [Testing](#testing) above for the full flow.

### Framework-Specific Conventions

- **React 19:** No `forwardRef` — `ref` is a regular prop.
- **Tailwind v4:** CSS-first `@theme` config, no `tailwind.config.ts`. Component classes (`.btn-primary`, `.article-card`, etc.) live in `globals.css` ported verbatim from the mockup.
- **Next.js 16.3.4:** `proxy.ts` (replaces `middleware.ts`; build errors if both exist), `output: 'standalone'` → `node …/server.js`, MDX via `pageExtensions`.
- **TypeScript:** `erasableSyntaxOnly: true` forbids `enum`/`namespace` — use `as const` objects + union types.

### Pre-commit Hooks

- **Husky + lint-staged** run Prettier + ESLint on staged files.
- **commitlint** enforces Conventional Commits format.

### SSH Push (when OpenSSH is unavailable)

If `git push` fails with `Permission denied (publickey)`, use the included Paramiko-based wrapper:

```bash
GIT_SSH_COMMAND="skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py -i docs/ssh-key.txt -o StrictHostKeyChecking=accept-new" git push origin main
```

Full troubleshooting in `skills/how-to-git-push-using-ssh-wrapper/SKILL.md`.

## Project Status

| Phase | Status | Key Deliverables |
|---|---|---|
| 1. Monorepo scaffold + toolchain | ✅ Complete | pnpm workspace, Turborepo, tsconfig.base, ESLint flat, Vitest, Husky |
| 2. Database + types + auth packages | ✅ Complete | Drizzle schema, edge-safe tokens, Better Auth instance, shared Zod types |
| 3. Landing page (mockup port) | ✅ Complete | Hero, Marquee, RecentNotes, SnippetShowcase, ArchivePreview, SubscribeSection |
| 4. Public blog routes | ✅ Complete | `/archive`, `/posts/[slug]`, `/snippets`, MDX rendering |
| 5. Subscribe + email | ✅ Complete | Server Action, Zod schema, sliding-window rate limiter, Resend integration |
| 6. Auth + admin | ✅ Complete | `proxy.ts` (was `middleware.ts`), login page, admin dashboard, post editor |
| 7. Admin (subscribers + comments + settings) | ✅ Complete | CSV export, comment moderation, settings form, RSS/sitemap/robots |
| 8. Validation + hardening | 🚧 In progress | Passes 5–7 (R-48..R-93) complete, incl. live E2E and a third full security audit; production checklist hardened — see the deploy steps above |

**Overall progress:** ~90% of the MEP shipped. The remaining work is hardening, security notes, and E2E test coverage (Playwright, deferred).

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `pnpm start` → landing page renders as unstyled raw HTML | Production deploy missing the standalone static assets — every `/_next/static/*` URL 404s (audit C-34) | Rebuild with the R-33 postbuild step (`pnpm build` runs it automatically), or copy `.next/static` into `.next/standalone/apps/web/.next/static` manually |
| `/archive` or `/posts/[slug]` → 500 with `SQLite database does not exist at "…"` | Standalone server resolved the CWD-relative `DATABASE_PATH` where no DB file exists; since R-38 boot fails fast instead of silently creating an empty database (audit C-36) | Set `DATABASE_PATH` to the **absolute path** of the migrated DB (or run `pnpm db:migrate && pnpm db:seed` against the resolved path), then restart — see the Production deployment checklist above |
| Boot log warns `NEXT_PUBLIC_SITE_URL is unset in production` | Deploy env never set the canonical URL, so robots.txt/RSS/sitemap/canonical advertise `http://localhost:3000` (audit H-36) | Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com` in the deploy environment |
| `/admin/login` redirects to itself forever (`ERR_TOO_MANY_REDIRECTS`) | Pre-R-31 admin shell layout wrapped the login page and gated it on an `x-pathname` header that nothing set (audit C-31) | Upgrade to the route-group shell at `src/app/(auth)/admin/(dashboard)/layout.tsx`; `/admin/login` renders outside it |
| `/archive` or `/posts/[slug]` → 500 with `unrecognized token: ":"` / `can only bind numbers` | PostgreSQL-only `count(*)::int` casts and `Date` binds in `packages/db/src/queries.ts` (audit C-32/C-33) | Fixed in R-32 (portable `count()` + `postEpochSeconds`); if you reintroduce raw SQL, bind epoch seconds and use drizzle `count()` |
| `git push` → `Permission denied (publickey)` | OpenSSH not installed in the environment | Use the SSH wrapper: `GIT_SSH_COMMAND="skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py -i docs/ssh-key.txt -o StrictHostKeyChecking=accept-new" git push origin main` |
| Any form submit (comment, admin CRUD) → 500 with `A "use server" file can only export async functions` | A `'use server'` file exports a Zod schema/constant (Next.js 16 forbids non-async exports); module evaluation throws and takes every action in the file down (audit C-37) | Keep schemas in plain modules (`@devlog/types`, `features/{feature}/schemas.ts`); `use-server-exports-scan.test.ts` blocks regressions (R-48) |
| Post pages / login page canonical + OG tags advertise the build machine's URL | Prerendered HTML baked the build-time `NEXT_PUBLIC_SITE_URL` (audit H-37) | Build with the production value set; `revalidate = 3600` (R-49) self-heals within an hour of deploy |
| `pnpm start` → `next start does not work with output: standalone` | `next.config.ts` `output:'standalone'` but `next start` ignores standalone bundle | Use `pnpm start` → `node apps/web/.next/standalone/apps/web/server.js` (`pnpm --filter @devlog/web start:next` for `next start`) |
| `canonical`/`og:url` still `http://localhost:3000` after `pnpm build` + `node …/server.js` | Standalone server started without sourcing `.env.local` (`sh` `source: not found` — `dash` has no `source`) | Start with `bash -c 'set -a; . .env.local; node …/server.js'` or `bash start_server.sh` (which does this + health check) |
| Build fails with `better-sqlite3` error in `proxy.ts` | `proxy.ts` imported `@devlog/auth` (root) which pulls `better-sqlite3` into the Edge bundle | Import `@devlog/auth/tokens` instead — it's pure Web Crypto `crypto.subtle` (`async`, no Node deps) |
| `tsc` fails with `enum declarations are not allowed` | `erasableSyntaxOnly: true` is set in `tsconfig.base.json` | Use `as const` object + union type: `const Role = { Author: 'author', Subscriber: 'subscriber' } as const; type Role = typeof Role[keyof typeof Role];` |
| Vitest mock factory throws `Cannot access X before initialization` | `vi.mock()` is hoisted above imports; outer-scope vars aren't available in the factory | Inline everything inside the factory. Use `vi.hoisted()` if you must share state |
| Subscribe flow silently does nothing in dev | `RESEND_API_KEY` is unset — the flow degrades gracefully | Set `RESEND_API_KEY=re_test_...` in `.env.local`, or check server logs for the "skipped" message |
| `NEXT_PUBLIC_SITE_URL` mismatch breaks RSS/OG tags | Default is `http://localhost:3000`; prod deploy didn't override | Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com` in the deploy environment |
| Article card hover shadow looks wrong in light theme | Tailwind's default `shadow-lg` was used instead of the mockup's `box-shadow` | Use the `.article-card` component class from `globals.css` (lines 410–487); the light-theme override is built in |
| `drizzle-kit generate` → `Failed to find Response internal state key` | `drizzle-kit 0.27 + Node 24` native `fetch` clash | Upgrade to `drizzle-kit ^0.31` (now `0.31.10`) + use `--config ./drizzle.config.ts` |
| `pnpm` warns `pnpm field no longer read` | `package.json pnpm.overrides` deprecated since pnpm 10 | Move `overrides` to `pnpm-workspace.yaml` (kept `pnpm` field for `9.15.4` compat; audit stays `0`) |
| Build warns `middleware file convention deprecated` | Next 16.3.4 renamed `middleware.ts` → `proxy.ts`; build errors if both exist | Use only `apps/web/src/proxy.ts` (`export async function proxy`) |

## License

Proprietary. © Alex Rivera. Built with care, not frameworks.

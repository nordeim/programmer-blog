# `/dev/log` — Notes from a Programmer's Desk

[![Built with Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Tests: 272](https://img.shields.io/badge/tests-272-6ead2a?logo=vitest&logoColor=white)](https://vitest.dev/)
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

Current audit posture: **0 vulnerabilities** in `pnpm audit --prod` — 0 critical, 0 high, 0 moderate, 0 low (down from 50 total / 3 critical / 18 high at audit time). Coverage: 65.36% lines (up from 44.43%) against staged thresholds; the original 80/75/80/80 target is tracked as backlog item R-30 in `REMEDIATION_PLAN.md` (admin form suite + blog components still untested).

## Tech Stack

| Layer | Technology | Version | Critical Note |
|---|---|---|---|
| Package manager | pnpm | `9.15.4` | Never `npm` or `yarn`. Workspace via `pnpm-workspace.yaml`. |
| Monorepo | Turborepo | `^2.4.0` | `turbo.json` declares `globalEnv` for env-aware caching. |
| Web framework | Next.js (App Router) | `^16.0` | `output: 'standalone'`; `middleware.ts` (not `proxy.ts`). |
| UI runtime | React | `^19.0` | No `forwardRef` — `ref` is a regular prop. |
| Language | TypeScript | `^5.9.0` | `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly` (forbids `enum`/`namespace`). |
| Styling | Tailwind CSS | v4 (CSS-first `@theme`) | No `tailwind.config.ts`. Tokens in `globals.css` + `packages/config/tailwind/base.css`. |
| ORM | drizzle-orm | `^0.40` | SQLite-only; migrations via `drizzle-kit`. |
| Database | better-sqlite3 | `^12` | Single file at `apps/web/devlog.db`. No Postgres. |
| Auth | @devlog/auth (homegrown) | — | HMAC-SHA256 session/transaction tokens + scrypt passwords. Better Auth removed per ADR-004 amendment (R-2). |
| Email | Resend + React Email | `^4` / `^3` | Degrades gracefully without `RESEND_API_KEY` in dev. |
| Validation | Zod | `^3.25` | At every boundary: Server Action inputs, env vars, API bodies. |
| Client state | Zustand | `^5` | Theme + UI stores. Never for server state. |
| Linter | ESLint | 9 (flat config) | `no-restricted-syntax` blocks `as any`/`enum`/`namespace`. |
| Test runner | Vitest + jsdom | `^2.1` / `^25` | Co-located tests: `Foo.tsx` ↔ `Foo.test.tsx`. |
| Content | MDX | — | Posts/snippets in `apps/web/content/*.mdx`. |

## Architecture

```mermaid
flowchart TB
    subgraph Edge["Edge Runtime (Layer 0)"]
        MW[middleware.ts<br/>admin auth guard]
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
        P2[auth — Better Auth + tokens.ts]
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
4. **Edge-safe auth split** — `@devlog/auth/tokens` is pure Web Crypto (no Drizzle, no better-sqlite3) so `middleware.ts` can import it.
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
│   ├── content/                       # MDX essays and snippets
│   ├── middleware.ts                  # Layer 0: admin route guard (Edge Runtime)
│   ├── next.config.ts                 # Security headers, transpilePackages, MDX, standalone
│   ├── vitest.config.ts               # Vitest + jsdom
│   └── postcss.config.mjs
├── packages/
│   ├── db/                            # Drizzle schema + client + migrations + seed
│   ├── auth/                          # Better Auth instance + edge-safe tokens.ts
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

# 4. Database (first run only)
pnpm db:generate   # Generate SQL migrations from schema.ts
pnpm db:migrate     # Apply migrations (creates apps/web/devlog.db)
pnpm db:seed        # Seed mockup data (3 posts, 6 archive items, 5 snippets, 1 author)

# 5. Run
pnpm dev           # Boots Next.js at http://localhost:3000

# 6. Verify the full quality gate
pnpm check         # = check-types && lint && test && build
```

### Verify Setup

| Step | Expected output |
|---|---|
| `pnpm check-types` | `0 errors` across all 5 packages |
| `pnpm lint` | `0 errors` (3 pre-existing warnings are acceptable) |
| `pnpm test` | `272 tests passing` across all packages |
| `pnpm build` | Standalone build at `apps/web/.next/standalone/` |
| `pnpm dev` → http://localhost:3000 | Landing page with dark theme + typewriter + marquee |

## Environment Variables

12 environment variables (1 of them is `NODE_ENV`, set by Next.js). See `.env.example` for the canonical source.

### Server-side (read via `apps/web/src/lib/env.ts` — Zod-validated)

| Variable | Purpose | Required in prod | Default |
|---|---|---|---|
| `DATABASE_PATH` | SQLite file path (relative to `apps/web/`) | No | `./devlog.db` |
| `BETTER_AUTH_SECRET` | 32-byte session cookie signing key | **Yes** | — |
| `BETTER_AUTH_URL` | Canonical site URL for auth callbacks | No | `http://localhost:3000` |
| `RESEND_API_KEY` | Resend API key (`re_test_...` or `re_...`) | No (degrades gracefully) | — |
| `RESEND_FROM` | From address (must be on verified Resend domain) | No | `onboarding@resend.dev` |
| `SIGNED_TOKEN_SECRET` | 32-byte HMAC key for subscribe/unsubscribe tokens | **Yes** | — |
| `GITHUB_STATS_FALLBACK_STARS` | Used when GitHub API rate-limited | No | `82400` |
| `GITHUB_STATS_FALLBACK_FORKS` | Used when GitHub API rate-limited | No | `4180` |
| `CRON_SECRET` | Shared secret for `POST /api/cron/*` endpoints | No | — |

### Public (inlined by Next.js, safe in client components)

| Variable | Purpose | Default |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for RSS, OG tags, email links | `http://localhost:3000` |
| `NEXT_PUBLIC_GITHUB_REPO` | `owner/repo` for the nav star pill | `tailwindlabs/tailwindcss` |
| `NEXT_PUBLIC_AUTHOR_EMAIL` | Author email for footer mailto link | `hi@devlog.example` |

**Access pattern:** Never read `process.env.FOO` directly in feature/component code. Always go through `apps/web/src/lib/env.ts`. Public vars (`NEXT_PUBLIC_*`) are inlined by Next.js and safe to read in client components.

## Routes Implemented

### Public

| Route | Type | Description |
|---|---|---|
| `/` | Public | Dynamic landing page (Hero, Marquee, RecentNotes, SnippetShowcase, ArchivePreview, SubscribeSection) |
| `/archive` | Public | Paginated post listing with tag filter + search |
| `/archive/page/[page]` | Public | Alternative paginated URL for SEO |
| `/posts/[slug]` | Public | MDX-rendered post with comments + prev/next |
| `/snippets` | Public | Snippet index |
| `/snippets/[slug]` | Public | Single snippet |
| `/rss.xml` | Public | RSS 2.0 feed |
| `/sitemap.xml` | Public | Sitemap |
| `/robots.txt` | Public | Robots |
| `/unsubscribe` | Public | Token-verified unsubscribe page |
| `/preferences` | Public | Subscriber preferences |
| `/api/confirm` | Public | Subscribe token verification |
| `/api/github-stats` | Public | Cached GitHub stats (60s TTL) |
| `/api/rss.xml` | Public | RSS 2.0 feed route |
| `/api/sitemap.xml` | Public | Sitemap route |
| `/api/robots.txt` | Public | Robots route |

### Auth (gated by `middleware.ts`)

| Route | Description |
|---|---|
| `/admin/login` | Login form |
| `/admin` | Dashboard with 4 stat cards |
| `/admin/posts` | Posts list + editor |
| `/admin/posts/new` | New post editor |
| `/admin/posts/[id]` | Edit existing post |
| `/admin/subscribers` | Subscriber list + CSV export |
| `/admin/subscribers/export` | CSV export endpoint |
| `/admin/comments` | Comment moderation queue |
| `/admin/settings` | Site settings form |

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
- ✅ `pnpm test` — 272 tests passing across all packages (229 web / 16 auth / 21 types / 3 db / 3 email)
- ✅ `pnpm test:coverage` — 65.36% lines vs staged regression thresholds (80% target tracked as R-30)
- ✅ `pnpm build` — 25 routes, including `/opengraph-image`, `/posts/[slug]/opengraph-image`, `/icon.svg`, `/manifest.webmanifest`
- ✅ `pnpm audit --prod` — **0 vulnerabilities** (resolved via dependency removal + `pnpm.overrides`)

## The Golden Rule

A layer may only import from layers *below* it (higher-numbered) or from its own layer. Violations are review-blocking.

```
Layer 0: proxy    — Edge request handler. NO database access.
                    Imports only @devlog/auth/tokens (pure crypto).
Layer 1: app      — App Router. Stays thin. NO direct database queries in route files.
                    Routes call into features/ or lib/, never into packages/db directly.
Layer 2: features — Feature modules. Each owns its UI, queries, mutations, types.
                    May import: domain, lib, packages/*, components, hooks.
Layer 3: domain   — Pure types and logic. NO IO. NO React. NO Drizzle. NO better-sqlite3.
                    Zod schemas, slugify, signed-token helpers, pure validators.
Layer 4: lib      — Infrastructure adapters (db, auth, email, github, rate-limit, rss, env).
                    The ONLY layer that imports drizzle-orm, better-sqlite3, resend, etc.
```

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
- **Next.js 16:** `middleware.ts` (not `proxy.ts`), `output: 'standalone'`, MDX via `pageExtensions`.
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
| 6. Auth + admin | ✅ Complete | `middleware.ts`, login page, admin dashboard, post editor |
| 7. Admin (subscribers + comments + settings) | ✅ Complete | CSV export, comment moderation, settings form, RSS/sitemap/robots |
| 8. Validation + hardening | 🚧 In progress | This README/CLAUDE.md/AGENTS.md/SKILL.md refresh; security notes pending |

**Overall progress:** ~90% of the MEP shipped. The remaining work is hardening, security notes, and E2E test coverage (Playwright, deferred).

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `git push` → `Permission denied (publickey)` | OpenSSH not installed in the environment | Use the SSH wrapper: `GIT_SSH_COMMAND="skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py -i docs/ssh-key.txt -o StrictHostKeyChecking=accept-new" git push origin main` |
| Build fails with `better-sqlite3` error in `middleware.ts` | `middleware.ts` imported `@devlog/auth` (root) which pulls `better-sqlite3` into the Edge bundle | Import `@devlog/auth/tokens` instead — it's pure Web Crypto with no Node deps |
| `tsc` fails with `enum declarations are not allowed` | `erasableSyntaxOnly: true` is set in `tsconfig.base.json` | Use `as const` object + union type: `const Role = { Author: 'author', Subscriber: 'subscriber' } as const; type Role = typeof Role[keyof typeof Role];` |
| Vitest mock factory throws `Cannot access X before initialization` | `vi.mock()` is hoisted above imports; outer-scope vars aren't available in the factory | Inline everything inside the factory. Use `vi.hoisted()` if you must share state |
| Subscribe flow silently does nothing in dev | `RESEND_API_KEY` is unset — the flow degrades gracefully | Set `RESEND_API_KEY=re_test_...` in `.env.local`, or check server logs for the "skipped" message |
| `NEXT_PUBLIC_SITE_URL` mismatch breaks RSS/OG tags | Default is `http://localhost:3000`; prod deploy didn't override | Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com` in the deploy environment |
| Article card hover shadow looks wrong in light theme | Tailwind's default `shadow-lg` was used instead of the mockup's `box-shadow` | Use the `.article-card` component class from `globals.css` (lines 410–487); the light-theme override is built in |

## License

Proprietary. © Alex Rivera. Built with care, not frameworks.

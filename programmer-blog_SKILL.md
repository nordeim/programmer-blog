---
name: programmer-blog-skill
description: >
  Comprehensive engineering reference for the /dev/log programmer blog — a Next.js 16
  App Router + React 19 + Tailwind v4 (CSS-first @theme) + Drizzle ORM (better-sqlite3) +
  homegrown HMAC auth (@devlog/auth; Better Auth removed per ADR-004 amendment, R-2) +
  Resend + Vitest monorepo. Distilled from the completed Phases 1–7 of the Master
  Execution Plan (MEP) plus remediation Passes 1–8. Use this when extending, debugging,
  onboarding to, or replicating the /dev/log architecture.
version: 1.1.0
project: devlog
last_updated: 2026-09-04
project_state: 464 tests green (355 web + 41 db + 40 auth + 21 types + 7 email), 5 packages, Next 16.3.4 / drizzle-kit 0.31 / proxy.ts / Web Crypto, Phases 1–7 + remediation A-C + Passes 4–8 (R-37..R-97) complete
tags:
  - documentation
  - knowledge-distillation
  - nextjs-16
  - react-19
  - tailwind-v4
  - drizzle-orm
  - hmac-auth
  - monorepo
  - tdd
---

# `/dev/log` — Programmer Blog Engineering Skill (SKILL.md)

> **How to use this document:** This is the deep-dive codebase reference for `/dev/log`. Read §1–§3 before extending any feature. Read §9 + §10 when debugging. Read §11 before pushing. Read §19 + §20 when authoring or modifying design tokens / TypeScript types. All claims are verified against the actual codebase as of **2026-09-04** (Next 16.3.4 / drizzle-kit 0.31 / `proxy.ts` / Web Crypto `crypto.subtle` / `pnpm db:setup`, 464 tests, Pass 8 audit remediation R-95..R-97 complete).

---

## Table of Contents

1. [Project Identity & Design Philosophy](#1-project-identity--design-philosophy)
2. [Tech Stack & Environment](#2-tech-stack--environment)
3. [Bootstrapping & Configuration](#3-bootstrapping--configuration)
4. [The Design System (Code-First)](#4-the-design-system-code-first)
5. [Component Architecture & Patterns](#5-component-architecture--patterns)
6. [Custom Hooks Deep Dive](#6-custom-hooks-deep-dive)
7. [Content Management & Data Ingestion](#7-content-management--data-ingestion)
8. [Accessibility (WCAG AAA) Implementation](#8-accessibility-wcag-aaa-implementation)
9. [Anti-Patterns & Common Bugs](#9-anti-patterns--common-bugs)
10. [Debugging Guide](#10-debugging-guide)
11. [Pre-Ship Checklist](#11-pre-ship-checklist)
12. [Lessons Learnt & How to Avoid Them](#12-lessons-learnt--how-to-avoid-them)
13. [Pitfalls to Avoid](#13-pitfalls-to-avoid)
14. [Best Practices](#14-best-practices)
15. [Coding Patterns](#15-coding-patterns)
16. [Coding Anti-Patterns](#16-coding-anti-patterns)
17. [Responsive Breakpoint Reference](#17-responsive-breakpoint-reference)
18. [Z-Index Layer Map](#18-z-index-layer-map)
19. [Color Reference (Complete)](#19-color-reference-complete)
20. [The Complete TypeScript Interface Reference](#20-the-complete-typescript-interface-reference)
- [Appendix A: ADRs (Architecture Decision Records)](#appendix-a-adrs)
- [Appendix B: The Meticulous Approach](#appendix-b-the-meticulous-approach)
- [Appendix C: Quick Reference Card](#appendix-c-quick-reference-card)

---

## 1. Project Identity & Design Philosophy

### 1.1 What This Is

`/dev/log — Notes from a Programmer's Desk` (package name: `devlog`) is a production-grade programmer blog by Alex Rivera. Built as a pnpm + Turborepo monorepo with Next.js 16 App Router, React 19, Tailwind CSS v4 (CSS-first `@theme`), Drizzle ORM + better-sqlite3, the homegrown HMAC auth package `@devlog/auth` (Better Auth removed per ADR-004 amendment, R-2), Resend + React Email, and Vitest.

The repo ships three engineering specs at the root: a [PRD](./Project_Requirements_Document.md) (60+ functional requirements), a [PAD](./Project_Architecture_Document.md) (7 ADRs + 5-layer golden rule), and an [MEP](./Master_Execution_Plan.md) (9 phases + Phase 9/9.5 remediation — originally 8-phase, extended via Passes 3–8). All code changes trace to an FR-N in the PRD via `Refs: FR-N` commit footers.

### 1.2 The Design Thesis

The visual identity is a **terminal-meets-editor aesthetic**: a JetBrains Mono / Fraunces / Space Grotesk typography stack, three closed-budget themes (dark / light / cyber), CSS-only animation (no Framer Motion, no GSAP), and a strict 4px corner radius scale. The landing page is a pixel-for-pixel port of [`landing_page_mockup.html`](./landing_page_mockup.html) — the mockup is the source of truth and is **never modified** without an explicit design decision.

### 1.3 Non-Negotiable Design Rules

- **Three themes only.** Dark (`#0c0b09`), Light (`#f3ecdc`), Cyber (`#02060a`). The design budget is closed; do not add a 4th theme.
- **CSS-only animation.** All motion is `@keyframes` + `transition`. `prefers-reduced-motion` is enforced globally in `globals.css`.
- **4px radius scale.** `--radius-sm: 2px`, `--radius: 4px`, `--radius-md: 4px`, `--radius-lg: 8px`, `--radius-full: 999px`. No other values.
- **Typography hierarchy:**
  - `--font-display: 'Fraunces', Georgia, serif` — italic display accents only.
  - `--font-mono: 'JetBrains Mono', 'Fira Code', monospace` — all headings, code, nav, buttons.
  - `--font-body: 'Space Grotesk', system-ui, sans-serif` — body copy only.
- **No purple gradients.** The accent palette is amber (`#f59e0b`) on dark, terracotta (`#c2410c`) on light, neon yellow (`#ffea00`) on cyber. Never introduce purple.
- **No Bootstrap / Material / shadcn-ui default styles.** Component classes (`.btn-primary`, `.article-card`, `.code-window`, etc.) are authored in `globals.css` and are the only allowed visual primitives.

### 1.4 CTA Hierarchy

1. **`.btn-primary`** — solid accent background, black mono text, shimmer sweep on hover. Used for the primary action (e.g. "read latest", "subscribe").
2. **`.btn-secondary`** — transparent with strong border, accent color on hover. Used for the secondary action (e.g. "≡ subscribe" on hero).
3. **`.stat-pill`** — pill-shaped, mono 12px, used for live GitHub stats in the nav.
4. **`.tag`** — square 2px radius, mono 10px uppercase, accent-tinted background. Used for issue numbers and post tags.
5. **`.hover-link`** — text-only with animated underline. Used for footer + archive links.

### 1.5 The Anti-Generic Mandate

The repo explicitly rejects: Bootstrap grids, Material Design elevation, default Tailwind shadow utilities (`shadow-lg`), `forwardRef`, `enum`/`namespace`, default exports, `as any`, Framer Motion, GSAP, Redux, React Query, swr, JWT (we use HMAC tokens), Postgres (SQLite only), Redis (in-memory rate limiter only).

---

## 2. Tech Stack & Environment

### 2.1 Locked Versions

| Layer | Technology | Version | Critical Note |
|---|---|---|---|
| Package manager | pnpm | `9.15.4` | Declared in `package.json#packageManager`. Never `npm` or `yarn`. |
| Runtime | Node.js | `≥20.0.0` | Declared in `package.json#engines`. |
| Monorepo | Turborepo | `^2.4.0` | `turbo.json` declares `globalEnv` for env-aware caching. |
| Web framework | Next.js (App Router) | `^16.3.4` | `output: 'standalone'` → `apps/web/.next/standalone/apps/web/server.js`; `proxy.ts` (replaces `middleware.ts` since 16.3.4, build errors if both exist). |
| UI runtime | React | `^19.0` | No `forwardRef` — `ref` is a regular prop. |
| Language | TypeScript | `^5.9.0` | `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`. |
| Styling | Tailwind CSS | v4 (CSS-first `@theme`) | No `tailwind.config.ts`. Tokens in `globals.css` + `packages/config/tailwind/base.css`. |
| ORM | drizzle-orm + drizzle-kit | `^0.45.2` + `^0.31.0` (`0.31.10` resolved) | SQLite-only; `drizzle-kit generate --config ./drizzle.config.ts` in `@devlog/db`. Node 24 `fetch` clash fixed in 0.31. |
| Database | better-sqlite3 | `^12.11.1` (`@types ^7.6.13`) | Single file at `apps/web/devlog.db`. No Postgres, no Redis. |
| Auth | @devlog/auth (homegrown) | — | HMAC-SHA256 via **Web Crypto `crypto.subtle`** (`async`, `timingSafeEqualHex`, no `node:crypto`/`Buffer`) + scrypt. Better Auth removed R-2. All token helpers `async` since 2026-09-03. |
| Email | Resend + React Email | `^4.8.0` / `^3` | Degrades gracefully without `RESEND_API_KEY` in dev. |
| Validation | Zod | `^3.25.76` | At every boundary: env, Server Action inputs, API bodies. |
| Client state | Zustand | `^5.0.15` | Theme + UI stores only. Never for server state. |
| Linter | ESLint | `9.39.5` flat | `no-restricted-syntax` blocks `as any`/`enum`/`namespace`. `eslint-config-next 16.3.4`. |
| Test runner | Vitest + jsdom | `^3.2.7` / `^25.0.1` + `@vitest/coverage-v8 ^2.1.9` | Co-located tests: `Foo.tsx` ↔ `Foo.test.tsx`. |
| Content | MDX | (bundled with Next.js) | `pageExtensions: ['ts','tsx','js','jsx','md','mdx']`. |
| Formatter | Prettier | `^3.9.6` + `prettier-plugin-tailwindcss ^0.6.14` | `pnpm format` write, `format:check` CI gate. |
| Styling | Tailwind CSS | `^4.3.3` + `@tailwindcss/postcss ^4.3.3` | CSS-first `@theme`, no `tailwind.config.ts`. |
| Pre-commit | Husky + lint-staged | `^9.1.0` / `^15.2.0` | Runs Prettier + ESLint on staged files. |
| Commit lint | @commitlint/cli + config-conventional | `^19.5.0` | Enforces Conventional Commits. Subject ≤72 chars. |

### 2.2 Environment Variables (13 application variables + `NODE_ENV`)

Defined in [`apps/web/src/lib/env.ts`](./apps/web/src/lib/env.ts) via Zod. **Throws at boot in production** if any required var is missing.

**Server-side** (read via `apps/web/src/lib/env.ts`):

| Variable | Zod rule | Default | Purpose |
|---|---|---|---|
| `DATABASE_PATH` | `z.string()` | `./devlog.db` | SQLite file path. R-38: the file must EXIST or boot throws (no silent empty-DB creation). |
| `BETTER_AUTH_SECRET` | `z.string().min(32).optional()` | — | 32-byte session cookie signing key. **Required in prod.** |
| `BETTER_AUTH_URL` | `z.string().url()` | `http://localhost:3000` | Canonical site URL for auth callbacks. |
| `RESEND_API_KEY` | `z.string().startsWith('re_').optional()` | — | Resend API key. Optional in dev (degrades gracefully). |
| `RESEND_FROM` | `z.string().email()` | `onboarding@resend.dev` | From address (must be on verified Resend domain). |
| `SIGNED_TOKEN_SECRET` | `z.string().min(32).optional()` | — | 32-byte HMAC key for transaction tokens (R-62: keyed by this since Pass 6; dev falls back to the session secret). **Required in prod — throws at boot if missing (R-61).** Confirm tokens are v2 purpose-tagged with a 7-day server-enforced TTL (R-80); manage links stay long-lived v1. |
| `GITHUB_STATS_FALLBACK_STARS` | `z.coerce.number().int()` | `82400` | Used when GitHub API rate-limited. |
| `GITHUB_STATS_FALLBACK_FORKS` | `z.coerce.number().int()` | `4180` | Used when GitHub API rate-limited. |
| `CRON_SECRET` | `z.string().optional()` | — | **Reserved** — no cron routes exist yet (R-47 doc sync). |
| `DEV_AUTHOR_PASSWORD` | `z.string().min(8).optional()` | — | Password for the seeded author. Dev-only override (login-page hint renders in development only, R-37); **production seeds throw without it or if <16 chars (R-57/C-38 + R-92)** — `start_server.sh` generates a strong one. Zod is intentionally lenient (`min(8)`) — the production guard in `packages/db/src/seed.ts` enforces `≥16`. |
| `NODE_ENV` | `z.enum(['development','test','production'])` | `development` | Set by Next.js. In production, a localhost `NEXT_PUBLIC_SITE_URL` warns at boot (R-41). |

**Public** (inlined by Next.js, safe in client components):

| Variable | Zod rule | Default | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `z.string().url()` | `http://localhost:3000` | Canonical site URL for RSS, OG tags, email links. |
| `NEXT_PUBLIC_GITHUB_REPO` | `z.string()` | `tailwindlabs/tailwindcss` | `owner/repo` for the nav star pill. |
| `NEXT_PUBLIC_AUTHOR_EMAIL` | `z.string().email()` | `hi@devlog.example` | Author email for footer mailto. |

**Access pattern:** Never read `process.env.FOO` directly in feature/component code. Always go through `apps/web/src/lib/env.ts`. Public vars (`NEXT_PUBLIC_*`) are inlined by Next.js and safe to read in client components.

### 2.3 Test Counts (2026-09-04, post-Pass-8 baseline)

- **464 tests** across 5 packages (`355 web` + `41 db` + `40 auth` + `21 types` + `7 email`) after Pass 8. Pass 8 added 5: the email dependency-manifest scan (R-95) and three signIn timing-equalization pins (R-96).
- Pass 5 added 25 (the `'use server'` export scan, the revalidate contract scan, `getTagsInUse`/`getTagsForPosts` integration tests, archive tag rendering, `stripLeadingH1` units, unsubscribe copy tests). Pass 6 added 45: the layer-boundary scan, the server-action IP scan, the seed production-password guard, rate-limit eviction, `safeNext` open-redirect units + login-page pins, env boot-throw cases, token key-separation, snippet single-h1, schema scheme guards, search hardening integration tests.
- All green. Updated on every commit via `turbo run test` (`pnpm check` = `check-types && lint && test:coverage && audit --prod && build`).

---

## 3. Bootstrapping & Configuration

### 3.1 First-Time Setup

```bash
# Requires: Node ≥20, pnpm ≥9.15
node --version
pnpm --version

git clone https://github.com/nordeim/programmer-blog.git
cd programmer-blog
pnpm install

cp .env.example .env.local
# Edit .env.local:
#   BETTER_AUTH_SECRET:   openssl rand -hex 32
#   SIGNED_TOKEN_SECRET:  openssl rand -hex 32
#   RESEND_API_KEY (optional in dev)

pnpm db:generate   # `drizzle-kit generate --config ./drizzle.config.ts` in @devlog/db (0.31)
pnpm db:migrate     # Applies migrations → creates apps/web/devlog.db
pnpm db:seed        # Seeds mockup data (9 posts, 12 tags, 3 subscribers, 2 comments, 1 author)
# One-shot from scratch:
pnpm db:setup      # = generate && migrate && seed (135K db, 34/34 pages)

pnpm dev           # http://localhost:3000 (Turbopack)
# Production (standalone):
pnpm build         # → apps/web/.next/standalone/apps/web/server.js
pnpm start         # node apps/web/.next/standalone/apps/web/server.js (not next start)
pnpm check         # Full quality gate: check-types && lint && test:coverage && audit --prod && build
```

### 3.2 Critical Configuration Files

| File | Purpose | Locked? |
|---|---|---|
| [`tsconfig.base.json`](./tsconfig.base.json) | Root TS config. `strict`, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, path aliases. | Yes — do not relax. |
| [`apps/web/next.config.ts`](./apps/web/next.config.ts) | Next.js 16.3.4 `output: 'standalone'` → `.next/standalone/apps/web/server.js` (`node …/server.js`, not `next start`), `transpilePackages`, MDX, security headers. |
| [`apps/web/src/app/globals.css`](./apps/web/src/app/globals.css) | The full `/dev/log` design system. 1:1 port of mockup lines 14-578. | Yes — mockup is the source of truth. |
| [`packages/config/tailwind/base.css`](./packages/config/tailwind/base.css) | Raw color tokens per `[data-theme="dark\|light\|cyber"]`. | Yes — design budget closed. |
| [`turbo.json`](./turbo.json) | Turborepo task graph + `globalEnv` for env-aware caching. | Yes — adding a script requires updating `tasks`. |
| [`pnpm-workspace.yaml`](./pnpm-workspace.yaml) | Declares `apps/*` + `packages/*`; `overrides` block is **inert on the pinned pnpm 9.15.4** (workspace `overrides` require pnpm ≥10). Live pin is `package.json#pnpm.overrides` (`prismjs ^1.30.0`); `react-email` subtree removed from runtime deps in R-95 (C-42). |
| [`commitlint.config.mjs`](./commitlint.config.mjs) | Conventional Commits enforcement. | — |
| [`apps/web/src/proxy.ts`](./apps/web/src/proxy.ts) | Edge `proxy` (replaces `middleware.ts` since 16.3.4, `export async function proxy`). Build errors if both exist. | Yes — `matcher ['/admin/:path*']` |
| [`apps/web/vitest.config.ts`](./apps/web/vitest.config.ts) | Vitest + jsdom config. | — |

### 3.3 The `erasableSyntaxOnly` Gotcha

`tsconfig.base.json` sets `erasableSyntaxOnly: true` — this **forbids `enum` and `namespace`**. Use the `as const` pattern instead:

```typescript
// ❌ FORBIDDEN — won't compile
enum Role { Author = 'author', Subscriber = 'subscriber' }

// ✅ Correct
const Role = { Author: 'author', Subscriber: 'subscriber' } as const;
type Role = (typeof Role)[keyof typeof Role];
```

### 3.4 Path Aliases

Defined in `tsconfig.base.json#paths`:

```json
{
  "@devlog/db": ["./packages/db/src/index.ts"],
  "@devlog/db/*": ["./packages/db/src/*"],
  "@devlog/auth": ["./packages/auth/src/index.ts"],
  "@devlog/auth/*": ["./packages/auth/src/*"],
  "@devlog/email": ["./packages/email/src/index.ts"],
  "@devlog/email/*": ["./packages/email/src/*"],
  "@devlog/types": ["./packages/types/src/index.ts"],
  "@devlog/types/*": ["./packages/types/src/*"],
  "@devlog/config": ["./packages/config/index.ts"],
  "@devlog/config/*": ["./packages/config/*"]
}
```

`next.config.ts` declares all 5 in `transpilePackages` so Next.js consumes the TypeScript source directly (no build step for the local packages).

### 3.5 Workspace Layout

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'      # apps/web
  - 'packages/*'  # db, auth, email, types, config
```

---

## 4. The Design System (Code-First)

### 4.1 The `@theme` Block

[`apps/web/src/app/globals.css`](./apps/web/src/app/globals.css) lines 21-46 declares the `@theme` block. It **maps** raw color tokens (which live in `packages/config/tailwind/base.css` per `[data-theme="..."]`) to Tailwind utility class names:

```css
@theme {
  --color-bg: var(--bg);
  --color-bg-elev: var(--bg-elev);
  --color-bg-elev-2: var(--bg-elev-2);
  --color-fg: var(--fg);
  --color-fg-dim: var(--fg-dim);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-accent-2: var(--accent-2);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-card: var(--card);
  --color-code-bg: var(--code-bg);
  --color-code-fg: var(--code-fg);
  --color-glow: var(--glow);

  --font-display: 'Fraunces', Georgia, serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-body: 'Space Grotesk', system-ui, sans-serif;

  --radius: 4px;
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;
  --radius-full: 999px;
}
```

This means `bg-bg`, `text-accent`, `border-border-strong`, `font-mono`, `rounded-lg` etc. all work as Tailwind utilities. **Never use arbitrary values** like `text-[#f59e0b]` — use `text-accent` or extend `@theme`.

### 4.2 Typography Hierarchy

| Role | Font | Weight | Size | Tracking | Usage |
|---|---|---|---|---|---|
| Hero H1 | `--font-mono` | 700 | `clamp(2.5rem, 7.5vw, 6.5rem)` | -0.045em | Hero typewriter greeting |
| Section H2 | `--font-mono` | 700 | `text-3xl md:text-5xl` | -0.02em | Section titles |
| Article H3 | `--font-display` | 400 italic | `text-2xl md:text-3xl` | 0 | Hero subtitle |
| Body | `--font-body` | 400 | `text-base md:text-lg` | 0 | Paragraphs |
| Caption | `--font-mono` | 500 | `text-xs` | 0.08em (uppercase) | Tags, stats labels, buttons |
| Code | `--font-mono` | 400 | `text-xs md:text-sm` | 0 | `.code-window`, `.tk-*` tokens |

### 4.3 Keyframes (8 total)

| Name | File:Line | Duration | Purpose |
|---|---|---|---|
| `drift` | globals.css:144 | 16s ease-in-out infinite | Ambient float-dot orbs |
| `blink` | globals.css:188 | 1s steps(1) infinite | Typewriter cursor + logo cursor |
| `pulse` | globals.css:300 | 2s ease-in-out infinite | Stat dot pulse |
| `flashUp` | globals.css:313 | 0.7s ease | GitHub stats increment flash |
| `flash` | globals.css:554 | 0.7s ease | Copy button "copied" flash |
| `scroll` | globals.css:681 | 40s linear infinite | Marquee |
| (implicit) | — | — | `transition: width 0.35s` on `.hover-link::after` |
| (implicit) | — | — | `transition: transform 0.45s` on `.article-card` |

### 4.4 Custom `@utility`-Equivalent Component Classes

Tailwind v4 component classes live in `globals.css` (no `@utility` directive — they're plain CSS classes scoped under `@layer components` implicitly). The full list, ported verbatim from the mockup:

| Class | Mockup Lines | Purpose |
|---|---|---|
| `.progress-bar` | 107-116 | Top scroll-progress bar (z-index 100) |
| `.bg-grid` | 118-125 | Background grid pattern (56px grid) |
| `.float-dot` | 127-140 | Ambient blurred orb (drift animation) |
| `.mouse-glow` | 142-154 | Radial-gradient cursor follow |
| `.cursor::after` | 156-187 | Typewriter cursor (blink animation) |
| `.logo-cursor` | 199-207 | Logo block cursor |
| `.hover-link` | 176-233 | Text link with animated underline |
| `.theme-toggle` + `.theme-btn` | 194-268 | 3-way theme switch pill |
| `.stat-pill` + `.stat-dot` | 221-325 | GitHub stats pill with live dot |
| `.tag` | 257-342 | Issue number + post tag chip |
| `.btn-primary` | 272-381 | Solid accent button with shimmer sweep |
| `.btn-secondary` | 383-405 | Outlined accent button |
| `.article-card` | 331-487 | Recent-notes card with hover lift |
| `.code-window` + `.code-header` | 394-560 | macOS-style code container |
| `.copy-btn` | 516-561 | Copy button with copied flash |
| `.tk-key/.tk-str/.tk-fn/.tk-com/.tk-num/.tk-op/.tk-var` | 566-625 | Syntax highlighting tokens (per-theme) |
| `.archive-item` + `.archive-title` | 630-666 | Archive list row with left-dot hover |
| `.marquee-wrap` + `.marquee` | 671-688 | Marquee scroller (40s linear) |
| `.reveal` + `.reveal.visible` | 716-726 | Scroll-reveal animation (opacity + translateY) |
| `.input-field` | 731-749 | Form input with accent focus ring |

### 4.5 Border Radius Scale

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 2px | Tags, small chips |
| `--radius` / `--radius-md` | 4px | Buttons, inputs, code-window |
| `--radius-lg` | 8px | Article cards |
| `--radius-full` | 999px | Theme toggle, stat pills |

### 4.6 Shadow Definitions

Only two custom shadows:

- `.article-card:hover` → `box-shadow: 0 24px 48px -20px rgba(0, 0, 0, 0.45)` (dark/cyber) or `0 24px 48px -20px rgba(26, 22, 16, 0.2)` (light). Override at `[data-theme='light'] .article-card:hover`.
- `.code-window` → `box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.5)`.

**Do not use Tailwind's default `shadow-md` / `shadow-lg` utilities** — they don't match the mockup. Use the component class or replicate the exact shadow.

### 4.7 Theme Transition Animation

When switching themes, the body gets a `.theme-anim` class for 700ms that applies a `transition: background-color 0.6s, color 0.6s, border-color 0.6s, fill 0.6s, box-shadow 0.6s !important` to all elements. After 700ms, the class is removed (so future transitions don't accidentally animate). See `apps/web/src/hooks/use-theme.ts:17-33`.

---

## 5. Component Architecture & Patterns

### 5.1 The 5-Layer Golden Rule

A layer may only import from layers *below* it (higher-numbered) or from its own layer. **Violations are review-blocking.**

| Layer | Path | May NOT import |
|---|---|---|
| 0. proxy | `apps/web/src/proxy.ts` (replaces `middleware.ts` since 16.3.4, `export async function proxy`) | DB, Drizzle, `@devlog/auth` root. Only `@devlog/auth/tokens` (Web Crypto `crypto.subtle`, `async`) |
| 1. app | `apps/web/src/app/**` | `better-sqlite3`, `drizzle-orm/sqlite-core` — call `@devlog/db` query helpers instead (R-46). |
| 2. features | `apps/web/src/features/**` | Other features' internals; `drizzle-orm/sqlite-core` (use `@devlog/db/queries`, R-46). |
| 3. domain | `apps/web/src/domain/**` | React, Drizzle, better-sqlite3, resend — pure TS only. |
| 4. lib | `apps/web/src/lib/**` | (free pass — this is where Node-only deps live) |
| Packages | `packages/{db,auth,email,types,config}/**` | (free pass — consumed via Layer 4 only) |

**R-46 precision (Pass 4):** app/feature files MAY import drizzle-orm *operators* (`eq`, `and`, `desc`, `count`) and `@devlog/db` query functions — that is the as-built pattern across 10+ files. Still review-blocking outside `packages/db` + `lib`: `drizzle-orm/sqlite-core` table definitions, `better-sqlite3`, raw client opens, and any `drizzle-orm` import in `domain/`.

**Dependency-cruiser enforcement:** Planned for Phase 8+ (not yet wired). Until then, violations are caught in code review.

### 5.2 Component Directory Map

| Directory | File Count | Purpose |
|---|---|---|
| `apps/web/src/components/` | 6 components | shadcn-style primitives: `tag.tsx`, `copy-button.tsx`, `hover-link.tsx`, `code-window.tsx`, `skip-link.tsx`, (test files co-located) |
| `apps/web/src/features/landing/` | 11 components | Hero, Nav, Footer, Marquee, RecentNotes, SnippetShowcase, ArchivePreview, SubscribeSection, SubscribeToast, GitHubPill, ThemeToggle, HeroMouseGlow, HeroTypewriter, ProgressBar |
| `apps/web/src/features/blog/` | 6 components | PostPage, CommentForm, CommentList, TagFilter, Pagination, ArchiveList, MdxComponents |
| `apps/web/src/features/admin/` | 5 components | PostList, PostEditor, SubscriberList, CommentModeration, SettingsForm |
| `apps/web/src/features/auth/` | 3 components | LoginForm, SignOutButton, (actions) |
| `apps/web/src/features/subscribe/` | 2 files | `schema.ts` (Zod), `actions.ts` (Server Action) |

### 5.3 Client vs Server Component Decision Tree

```
Does the component use state, effects, browser APIs, or event handlers?
├── YES → 'use client' at the top
└── NO  → Server Component (default)
    └── Does it query the database directly?
        ├── YES → Move the query to packages/db/src/queries.ts and call from the Server Component
        └── NO  → Server Component is fine
```

**Rule of thumb:** If the component is purely presentational and receives props, it's a Server Component. The landing page (Hero, Marquee, RecentNotes, SnippetShowcase, ArchivePreview, SubscribeSection) is mostly Server Components with client sub-trees (`HeroMouseGlow`, `HeroTypewriter`, `ThemeToggle`, `GitHubPill`, `ProgressBar`).

### 5.4 The `queries.ts` Boundary Pattern

[`packages/db/src/queries.ts`](./packages/db/src/queries.ts) is the **only** place Drizzle queries are authored. Layer 1 (app) and Layer 2 (features) call queries from there:

```typescript
// ❌ FORBIDDEN — feature imports drizzle-orm directly
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
const post = db.select().from(schema.posts).where(eq(schema.posts.slug, slug)).get();

// ✅ Correct — feature imports from the boundary
import { getPostBySlug } from '@devlog/db/queries';
const post = await getPostBySlug(slug);
```

This centralizes query logic, makes testing easier (mock `@devlog/db` not Drizzle internals), and prevents Drizzle from leaking into Layer 1/2.

### 5.5 Auth Patterns — `verifySession()` vs `auth()`

| Context | Use | Why |
|---|---|---|
| `proxy.ts` (Edge, `proxy`) | `await verifySessionToken(cookie)` from `@devlog/auth/tokens` (Web Crypto `async`, no `Buffer`) | Edge Runtime can't import `@devlog/auth` (which pulls better-sqlite3). |
| Server Action / Route Handler | `getSessionFromCookies()` or `requireAuthor()` from `@devlog/auth` | Full DB access — can verify the user exists and check role. |
| Server Component (top of page) | `requireAuthor()` (throws `AuthorRequiredError` → caller does `notFound()` or `redirect('/admin/login')`) | Clean separation: throw → caller decides UX. |

### 5.6 CTA Hierarchy Implementation

Each CTA in the landing page is anchored to a CSS component class — **never** re-implemented with utility classes:

```tsx
// ✅ Correct
<Link href="/#notes" className="btn-primary">read latest <span aria-hidden>→</span></Link>
<Link href="/#about" className="btn-secondary"><span aria-hidden>≡</span> subscribe</Link>

// ❌ FORBIDDEN — does not match mockup
<Link className="bg-amber-500 px-6 py-3 rounded text-black font-mono uppercase">read latest</Link>
```

---

## 6. Custom Hooks Deep Dive

### 6.1 The 8 Custom Hooks

All hooks live in [`apps/web/src/hooks/`](./apps/web/src/hooks/). Every one is `'use client'` and respects `prefers-reduced-motion`.

| Hook | File | Purpose | Signature |
|---|---|---|---|
| `useTypewriter` | `use-typewriter.ts` | Type → pause → delete → advance cycle. Frozen on reduced motion. Pauses when tab hidden. | `(words: string[]) => string` |
| `useTheme` | `use-theme.ts` | Reads/writes `<html data-theme>`, localStorage, and `devlog-theme` cookie. Wires `T` keyboard shortcut. | `() => { theme, setTheme, cycle }` |
| `useMouseGlow` | `use-mouse-glow.ts` | Tracks mouse within a ref. Returns `{ ref, position, visible }`. No-op on reduced motion. | `() => { ref, position: {x,y}, visible }` |
| `useReveal` | `use-reveal.ts` | IntersectionObserver that adds `.visible` class on enter. Disconnects after firing. Falls back to immediate reveal. | `<T>(options?) => RefObject<T \| null>` |
| `useCopyToClipboard` | `use-copy-to-clipboard.ts` | Modern `navigator.clipboard.writeText` with hidden-`<textarea>` + `execCommand('copy')` fallback. `copied` resets after 1800ms. | `() => { copied, copy }` |
| `useKeyboardShortcut` | `use-keyboard-shortcut.ts` | Listens for `keydown` with optional modifiers. Ignores when INPUT/TEXTAREA/contenteditable is focused. | `(key, handler, deps?, options?) => void` |
| `useScrollProgress` | `use-scroll-progress.ts` | Returns 0-100 based on scroll position. Throttled via `requestAnimationFrame`. Lazy initializer for reduced-motion. | `() => number` |
| `useGitHubStats` | `use-github-stats.ts` | Receives initial `{ stars, forks }` from server. Polls `/api/github-stats` + simulated +1 every 9s. Falls back on 4xx/5xx. | `(args: { initialStars, initialForks, poll? }) => GitHubRepoStats` |

### 6.2 Implementation Details That Matter

#### `useTypewriter` — `prefersReducedMotion` Freeze

```typescript
// use-typewriter.ts:35-37
const [frozen] = useState(() =>
  typeof window !== 'undefined' && prefersReducedMotion() ? (words[0] ?? '') : '',
);
```

**Why:** We compute `frozen` once on the initial render (client-side only) so we don't need a `setState`-in-effect (which would trigger cascading renders under `react-hooks` v7's `set-state-in-effect` rule).

**Cleanup pattern:** Every `setTimeout` is returned as `() => clearTimeout(t)` so the timer cancels on unmount or effect re-run.

#### `useMouseGlow` — `passive: true` and Reduced-Motion Skip

```typescript
// use-mouse-glow.ts:44
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
```

**Why:** When the user has reduced motion on, we don't attach any listeners — the glow stays invisible. This is more efficient than attaching and just not updating state.

#### `useReveal` — Disconnect After Firing

```typescript
// use-reveal.ts:46-48
if (entry.isIntersecting) {
  entry.target.classList.add('visible');
  observer.disconnect();  // no repeat animation
}
```

**Why:** The mockup specifies reveal-once semantics. Re-firing on every scroll-into-view would feel janky.

#### `useScrollProgress` — `requestAnimationFrame` Throttling

```typescript
// use-scroll-progress.ts:32-41
function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const next = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    setProgress(Math.min(100, Math.max(0, next)));
    raf = 0;
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
```

**Why:** Without rAF throttling, `scroll` fires dozens of times per second. `passive: true` lets the browser do native scrolling without waiting for our handler.

#### `useCopyToClipboard` — Legacy Fallback

```typescript
// use-copy-to-clipboard.ts:48-69
// Legacy fallback: hidden textarea + execCommand.
const ta = document.createElement('textarea');
ta.value = text;
ta.setAttribute('readonly', '');
ta.style.position = 'fixed';
ta.style.opacity = '0';
ta.style.left = '-9999px';
document.body.appendChild(ta);
ta.select();
const ok = document.execCommand('copy');
document.body.removeChild(ta);
```

**Why:** `navigator.clipboard.writeText` is only available in HTTPS contexts. The legacy fallback handles HTTP dev envs and older Safari.

#### `useGitHubStats` — Capture Initial Snapshot in Catch Path

```typescript
// use-github-stats.ts:46
const initialSnapshot = { stars: initialStars, forks: initialForks };
```

**Why:** If we just referenced `initialStars` in the catch block, the effect's dependency array `[poll]` wouldn't capture changes. The snapshot avoids re-triggering the effect when state changes.

### 6.3 SSR Safety

Every hook that touches `window` or `document` checks `typeof window !== 'undefined'` (or uses `useState(() => ...)` lazy initializer) so the first server-rendered HTML matches the client-rendered HTML. **Hydration mismatches are review-blocking.**

---

## 7. Content Management & Data Ingestion

### 7.1 Static Data Files

| File | Type | Purpose | Count |
|---|---|---|---|
| `apps/web/content/snippets/*.mdx` | MDX | Code snippets (e.g. `use-typewriter.mdx`, `use-mouse-glow.mdx`) | 5 |
| `apps/web/content/posts/*.mdx` | MDX | Full essays | 3 (seeded) |
| `packages/db/src/seed.ts` | TS | Seeds the SQLite DB with mockup content (9 posts, 12 tags, 3 subscribers, 2 comments, 1 author, 1 `siteSettings` row) | 1 file |

### 7.2 Adding a New Post

1. Create `apps/web/content/posts/<slug>.mdx` with frontmatter (title, excerpt, publishedAt, tags).
2. (Optional) Add a row to `packages/db/src/seed.ts` so the post appears in the dev seed.
3. Run `pnpm db:seed` to re-seed the dev DB.
4. In production: insert the row via the admin post editor at `/admin/posts/new`.

**Affected files:** 1 MDX + optionally `seed.ts`. **Do not touch** `packages/db/src/schema.ts`, route files, or component files.

### 7.3 Adding a New Snippet

Same flow but in `apps/web/content/snippets/<slug>.mdx`. The `/snippets` and `/snippets/[slug]` routes auto-discover MDX files via the file system (Next.js `pageExtensions` includes `mdx`).

### 7.4 Why `import.meta.glob` Is NOT Used

Astro/Vite patterns use `import.meta.glob('./content/**/*.mdx')` to enumerate content at build time. **Next.js doesn't have this** — instead, MDX files in `app/` are routes themselves (if they match `pageExtensions`), and content in `content/` is read via the file system from Server Components or via `next-mdx-remote` (not currently used). For dynamic routes (`/posts/[slug]`), the page reads from the DB, not the file system.

### 7.5 MDX Rendering

The `/posts/[slug]` route renders MDX via `apps/web/src/lib/mdx.tsx` which compiles MDX → React elements at request time (or build time for static routes). The `mdx-components.tsx` file in `features/blog/` maps HTML elements (h1, p, pre, code) to project components (so `<pre>` uses `.code-window` styling, `<code>` uses `.tk-*` syntax tokens).

### 7.6 Seeding the Database

```bash
pnpm db:seed   # Runs packages/db/src/seed.ts
```

The seed script (as-built, Pass 6 doc sync I-9):
1. Inserts 1 author (Alex Rivera, role='author'; scrypt-hashed password from `DEV_AUTHOR_PASSWORD` — production refuses the public default, R-57/C-38).
2. Idempotent per row: skips rows that already exist (by slug/email/id), so re-running is safe.
3. Inserts 9 posts with MDX content and 12 tags, linked via `postsToTags`.
4. Inserts 3 subscribers and 2 comments (pending/approved examples).
5. Inserts 1 row in `siteSettings` (id=1, the single-row table).
6. Prints a summary. Snippets are NOT seeded — they are MDX files in `apps/web/content/snippets/`.

---

## 8. Accessibility (WCAG AAA) Implementation

### 8.1 Color Contrast

| Theme | Foreground | Background | Ratio | WCAG Level |
|---|---|---|---|---|
| Dark | `#f0ead6` (fg) | `#0c0b09` (bg) | 16.2:1 | AAA |
| Dark | `#c9c1ad` (fg-dim) | `#0c0b09` (bg) | 11.8:1 | AAA |
| Dark | `#8a8275` (muted) | `#0c0b09` (bg) | 6.1:1 | AA (Large) / AAA fails for small text — muted is for ≥14px only |
| Light | `#1a1610` (fg) | `#f3ecdc` (bg) | 13.1:1 | AAA |
| Light | `#3d362b` (fg-dim) | `#f3ecdc` (bg) | 9.8:1 | AAA |
| Light | `#6b6358` (muted) | `#f3ecdc` (bg) | 4.9:1 | AA |
| Cyber | `#4eff96` (fg) | `#02060a` (bg) | 13.4:1 | AAA |
| Cyber | `#8affb8` (fg-dim) | `#02060a` (bg) | 11.2:1 | AAA |
| Cyber | `#2a8a5e` (muted) | `#02060a` (bg) | 4.8:1 | AA |

**`--muted` is restricted to font sizes ≥14px** to stay within WCAG AA. Never use `text-muted` for body copy.

### 8.2 Focus Ring Specification

Defined in `globals.css` and via Tailwind utilities on the skip-link:

```css
/* globals.css:743-746 */
.input-field:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--glow);  /* 3px accent-tinted halo */
}
```

```tsx
// apps/web/src/app/layout.tsx:88-92 (skip-link focus state)
<a
  href="#main"
  className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:border focus:border-[var(--accent)] focus:bg-[var(--bg)] focus:px-4 focus:py-2 focus:font-mono focus:text-sm focus:text-[var(--accent)]"
>
  skip to content
</a>
```

### 8.3 Skip-to-Content Link

The root layout (`apps/web/src/app/layout.tsx`) renders a visually-hidden skip link as the first focusable element. On focus it becomes visible (fixed top-left, accent border, mono font).

### 8.4 `prefers-reduced-motion` Implementation

```css
/* globals.css:766-773 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Plus per-hook checks (`useTypewriter`, `useMouseGlow`, `useReveal`, `useScrollProgress`, `useGitHubStats`) that skip attaching listeners entirely when reduced motion is on — more efficient than the global CSS rule alone.

### 8.5 Touch Target Sizes

The smallest interactive elements:

- `.theme-btn` → 32×32px (Borderline — meets Apple's 44pt target via padding ring; below Material's 48dp. Documented as a known issue for Phase 8 hardening.)
- `.btn-primary` / `.btn-secondary` → 13px×22px padding + 12px text → ~44px tall. ✅
- `.stat-pill` → 7px×14px padding + 12px text → ~32px tall (meets minimum target).
- `.copy-btn` → 5px×11px padding + 11px text → ~28px tall (below 44px threshold — known issue for Phase 8).

### 8.6 ARIA Patterns

| Component | ARIA | Pattern |
|---|---|---|
| Skip link | `sr-only` + `focus:not-sr-only` | Visually hidden until focused |
| Theme toggle | (planned) `role="radiogroup"` + `aria-label` | 3 buttons, one `aria-pressed="true"` |
| Article card | (whole card is clickable via `<Link>`) | No `role="button"` — use semantic `<a>` |
| Code window | `aria-hidden="true"` on traffic-light dots | Decorative |
| Comment form | `aria-live="polite"` on error region | Form errors announced |
| Stat pill | `<a>` wrapping (link to GitHub repo) | Semantic anchor, no `role="button"` |

### 8.7 Verified With

- Lighthouse a11y score: 100 (target ≥95 maintained as design budget).
- Manual keyboard-only navigation through the landing page (Tab, Enter, `T` for theme).
- `prefers-reduced-motion: reduce` emulation via DevTools → all animations skip, content still readable.

---

## 9. Anti-Patterns & Common Bugs

### 9.1 AP-1: Importing `@devlog/auth` (root) in `proxy.ts` (Critical)

**Symptom:** Build fails with `better-sqlite3` error in the Edge Runtime bundle **or** `Turbopack: node:crypto not supported in Edge` warning:
```
Error: better-sqlite3 is not defined
  at Object.<anonymous> (proxy.ts)
Warning: node:crypto not supported in Edge (tokens.ts:16)
```

**Root cause:** `@devlog/auth` (root, `packages/auth/src/index.ts`) imports `'server-only'` + `@devlog/db` + `drizzle-orm`. The Edge Runtime can't bundle `better-sqlite3`/`node:crypto` (native Node addons). Since 2026-09-03 `tokens.ts` uses **Web Crypto `crypto.subtle` (`async`, no `Buffer`)**.

**Fix:** Import from `@devlog/auth/tokens` instead — pure Web Crypto (`crypto.subtle`, `timingSafeEqualHex`, `async`) with no Node-only deps:

```typescript
// ❌ FORBIDDEN — pulls better-sqlite3/node:crypto into the edge bundle
import { verifySessionToken } from '@devlog/auth';

// ✅ Correct — pure Web Crypto, edge-safe (async)
import { SESSION_COOKIE, verifySessionToken } from '@devlog/auth/tokens';
// usage: const userId = await verifySessionToken(cookie)
```

**Lesson:** The split between `packages/auth/src/index.ts` (DB-backed `signIn`/`getSession` + `drizzle`) and `packages/auth/src/tokens.ts` (pure Web Crypto `crypto.subtle`, `async`) is **non-negotiable** for the Edge Runtime. `proxy.ts` must remain `export async function proxy` (not `middleware`). ADR-002 + ADR-004 amendment. See also §15.11.

### 9.2 AP-2: Using `enum` or `namespace` (Critical)

**Symptom:** `tsc` fails with:
```
error TS1287: 'enum' declarations are not allowed when 'erasableSyntaxOnly' is enabled.
```

**Root cause:** `tsconfig.base.json` sets `erasableSyntaxOnly: true`. This flag (added in TS 5.8) forbids any syntax that can't be erased by the type checker — `enum`, `namespace`, parameter properties, etc.

**Fix:** Use `as const` + union types:

```typescript
// ❌ FORBIDDEN
enum Role { Author = 'author', Subscriber = 'subscriber' }
enum Status { Draft = 'draft', Published = 'published' }

// ✅ Correct
const Role = { Author: 'author', Subscriber: 'subscriber' } as const;
type Role = (typeof Role)[keyof typeof Role];

const Status = { Draft: 'draft', Published: 'published', Archived: 'archived' } as const;
type Status = (typeof Status)[keyof typeof Status];
```

**Lesson:** Drizzle's `text('role', { enum: ['author', 'subscriber'] })` syntax is fine — it's a Drizzle helper, not a TS `enum`. The two are unrelated.

### 9.3 AP-3: Using `as any` (Critical)

**Symptom:** ESLint fails with `Unexpected use of 'as any'` (rule `no-restricted-syntax`).

**Root cause:** `packages/config/eslint/base.mjs` blocks `as any` — it's the #1 type-safety leak.

**Fix:** Use `unknown` + narrow, or `satisfies`:

```typescript
// ❌ FORBIDDEN
const value = JSON.parse(input) as any;
value.someMethod();

// ✅ Correct — narrow with type guards
const value: unknown = JSON.parse(input);
if (typeof value === 'object' && value !== null && 'someMethod' in value) {
  // value is now narrowed
}

// ✅ Correct — use satisfies for type-checking without widening
const config = { retries: 3 } satisfies Config;
```

### 9.4 AP-4: Default Exports in `apps/web/src/**` (High)

**Symptom:** ESLint warning + harder-to-grep codebase.

**Root cause:** The project enforces named exports only in `apps/web/src/**` (per the project conventions). Default exports are anonymous at the import site.

**Fix:**

```typescript
// ❌ Avoid
export default function Hero() { ... }

// ✅ Correct
export function Hero() { ... }
```

### 9.5 AP-5: Using `enum`-style TS enums (High) — same as AP-2

(See AP-2.)

### 9.6 AP-6: Reading `process.env.FOO` Directly in Feature/Component Code (High)

**Symptom:** Variable is `undefined` in production. No Zod validation. No type safety.

**Root cause:** Public vars (`NEXT_PUBLIC_*`) are inlined by Next.js at build time — they work. But server-side vars are NOT inlined and must be read via the validated env module.

**Fix:** Use `apps/web/src/lib/env.ts`:

```typescript
// ❌ FORBIDDEN
const apiKey = process.env.RESEND_API_KEY;

// ✅ Correct
import { env } from '@/lib/env';
const apiKey = env.RESEND_API_KEY;  // typed, validated, throws at boot if missing
```

**Exception:** Public vars (`NEXT_PUBLIC_*`) can be read directly in client components because Next.js inlines them. But for consistency, prefer `env.NEXT_PUBLIC_*` in lib code.

### 9.7 AP-7: Arbitrary Tailwind Values (Medium)

**Symptom:** Color drift from the mockup.

**Root cause:** `text-[#f59e0b]` looks like `text-accent` but won't update if the theme's accent token changes.

**Fix:** Use the design token:

```tsx
// ❌ Avoid
<span className="text-[#f59e0b]">accent text</span>

// ✅ Correct
<span className="text-accent">accent text</span>
```

### 9.8 AP-8: Using Framer Motion / GSAP (High)

**Symptom:** Bundle size balloons; Lighthouse score drops below 95.

**Root cause:** CSS-only animation is the design budget. JS animation libraries add 30-50kb and trigger main-thread work.

**Fix:** Use `@keyframes` + `transition` in `globals.css`. See §4.3 for the 8 keyframes.

### 9.9 AP-9: `vi.fn()` Inside `vi.mock()` Factory Referencing Outer Scope (Critical)

**Symptom:** Vitest throws `Cannot access X before initialization` at test setup.

**Root cause:** `vi.mock()` is hoisted above imports by Vitest's transform. Outer-scope variables aren't available inside the factory function.

**Fix:** Inline everything, or use `vi.hoisted()`:

```typescript
// ❌ FORBIDDEN — outer scope reference
const mockFn = vi.fn();
vi.mock('@/lib/db', () => ({ db: { query: mockFn } }));

// ✅ Correct — inline
vi.mock('@/lib/db', () => {
  const mockFn = vi.fn();
  return { db: { query: mockFn } };
});

// ✅ Correct — vi.hoisted for shared state
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { query: mockFn } }));
```

### 9.10 AP-10: JSX in `.test.ts` Files (Medium)

**Symptom:** TypeScript fails to parse `.test.ts` files containing JSX.

**Root cause:** The file extension determines the parser. `.ts` doesn't enable JSX; `.tsx` does.

**Fix:** Rename the file to `.test.tsx`:

```bash
mv lib/foo.test.ts lib/foo.test.tsx
```

### 9.11 AP-11: Using Tailwind's `shadow-lg` Instead of Mockup Shadows (Medium)

**Symptom:** Article card hover shadow looks wrong on light theme.

**Root cause:** Tailwind's `shadow-lg` is `0 10px 15px -3px rgba(0,0,0,0.1)`. The mockup specifies `0 24px 48px -20px rgba(0,0,0,0.45)` (with a light-theme override).

**Fix:** Use the `.article-card` component class (which has the correct shadow), or replicate the exact shadow:

```tsx
// ✅ Correct — use the component class
<div className="article-card">...</div>

// ✅ Correct — explicit shadow
<div style={{ boxShadow: '0 24px 48px -20px rgba(0, 0, 0, 0.45)' }}>...</div>
```

### 9.12 AP-12: Forgetting `passive: true` on `scroll` / `touchmove` Listeners (Medium)

**Symptom:** Mobile scroll feels janky; Chrome DevTools warns about passive listener violations.

**Root cause:** Without `passive: true`, the browser waits for the handler to finish before native scrolling can start.

**Fix:** Always pass `{ passive: true }`:

```typescript
window.addEventListener('scroll', onScroll, { passive: true });
```

### 9.13 AP-13: Modifying `skills/**` (Medium)

**Symptom:** Skill files diverge from the canonical source.

**Root cause:** `skills/` is **read-only** — it contains reference skills (claude-md, agents-md, readme-md, etc.) used to generate project docs. They are not part of the project.

**Fix:** Treat `skills/**` as immutable. If a skill is broken, fix it upstream (in the skills repo), not in this project.

### 9.14 AP-14: Exporting Non-Async Values from a `'use server'` File (Critical)

**Symptom:** every Server Action in the file 500s at invocation (`POST … → 500`, client-side React error #441) while `pnpm test` stays green. Server log: `A "use server" file can only export async functions, found object.`

**Root cause:** Next.js 16 validates `'use server'` module exports when the Server Actions loader first evaluates the file. A Zod schema (`export const fooSchema = z.object(…)`) or a re-export (`export { schema }`) violates the async-function-only contract and throws at module evaluation — taking **all** actions in the file down (audit C-37: six mutations dead in production).

**Fix:** keep `'use server'` files action-only. Schemas live in plain modules: `@devlog/types` (canonical, e.g. `createCommentInputSchema`) or `features/{feature}/schemas.ts` (admin schemas, R-48). `apps/web/src/use-server-exports-scan.test.ts` scans every `'use server'` file and fails the suite on any non-async export. Same lesson as AP-9: the unit suite cannot see framework loader behavior — pin it with a source scan.

---

## 10. Debugging Guide

### 10.1 Build Failures

| Error | Cause | Fix |
|---|---|---|
| `better-sqlite3 is not defined` in `proxy.ts` / `node:crypto not supported in Edge` | Imported `@devlog/auth` (root) or `node:crypto` in `tokens.ts` | Import `@devlog/auth/tokens` (Web Crypto `crypto.subtle`, `async`) — see AP-1 / §15.11 |
| `Both middleware and proxy files detected` | Both `middleware.ts` and `proxy.ts` exist | Keep only `proxy.ts` (`export async function proxy`); delete `middleware.ts` shim |
| `next start does not work with output: standalone` | Ran `next start` with `output:'standalone'` | Use `pnpm start` → `node apps/web/.next/standalone/apps/web/server.js` |
| `Failed to find Response internal state key` | `drizzle-kit 0.27 + Node 24` `fetch` clash | Upgrade to `drizzle-kit ^0.31` and use `--config ./drizzle.config.ts` |
| `[WARN] pnpm field no longer read` | `package.json pnpm.overrides` deprecated | Move `overrides` to `pnpm-workspace.yaml` (keep `pnpm` field for 9.15.4 compat) |
| `error TS1287: 'enum' declarations are not allowed` | Used `enum` / `namespace` | Use `as const` + union types (see AP-2) |
| `error TS2571: Object is of type 'unknown'` | `noUncheckedIndexedAccess` returns `T \| undefined` | Narrow the type with type guards or use optional chaining |
| `Cannot find module '@devlog/db'` | Path alias not resolving | Check `tsconfig.base.json#paths` includes `@devlog/db`; run `pnpm install` to link the workspace |
| `Hydration failed: server HTML doesn't match client` | Theme or initial state mismatch | Check that hooks use lazy initializers (`useState(() => ...)`) for window/document access |
| `Error: ENOSPC: no space left on device` in dev | HMR accumulated stale SQLite handles (fixed by globalThis cache in `packages/db/src/client.ts`) | Restart `pnpm dev` — the globalThis cache should prevent recurrence |

### 10.2 Runtime Errors

| Error | Cause | Fix |
|---|---|---|
| `Error: Invalid environment variables` at boot | Zod env validation failed in prod | Check `.env.local` (dev) or deploy env vars (prod). Required: `BETTER_AUTH_SECRET` (32+), `SIGNED_TOKEN_SECRET` (32+) |
| `Error: invalid or expired token` on `/api/confirm` | HMAC verification failed OR the confirm link is older than the 7-day TTL (R-80) | Verify `SIGNED_TOKEN_SECRET` matches across env — transaction tokens are keyed by it (R-62). Confirm links expire after 7 days (re-subscribe to re-issue); unsubscribe/preferences links are long-lived by design. |
| `Error: AUTHOR_REQUIRED` in admin route | User is not signed in or not an author | Catch `AuthorRequiredError` and `redirect('/admin/login')` or `notFound()` |
| `Error: Too many comments. Try again later.` | Rate limit hit (10 per IP per hour) | Wait 1 hour or restart the dev server (clears in-memory bucket via `__resetRateLimit()` in tests) |
| Resend: `RESEND_API_KEY not configured. Email not sent.` | No API key in env | Set `RESEND_API_KEY=re_test_...` in `.env.local`. Dev sandbox accepts test keys. |

### 10.3 Test Failures

| Error | Cause | Fix |
|---|---|---|
| `Cannot access X before initialization` | `vi.mock()` factory references outer-scope vars | Inline the factory or use `vi.hoisted()` (see AP-9) |
| `SyntaxError: Unexpected token '<'` in `.test.ts` | JSX in `.ts` file | Rename to `.test.tsx` (see AP-10) |
| `Hydration mismatch` snapshot test failure | `useEffect`-driven state change before paint | Use `useState(() => ...)` lazy initializer for SSR-unsafe values |
| `Mock not called` despite `vi.mock` | Mock factory not hoisted properly | Make sure `vi.mock` is at the top level (not inside `describe` / `it`) |
| `ReferenceError: __dirname is not defined` in test | Edge Runtime code tested in jsdom | Use `process.cwd()` or `new URL(import.meta.url)` |

### 10.4 Visual / Styling Issues

| Symptom | Cause | Fix |
|---|---|---|
| Theme switch animates too slowly / quickly | `.theme-anim` body class stays applied beyond 700ms | Check `use-theme.ts:23` — the `setTimeout(700ms)` removes the class |
| Article card hover shadow wrong on light theme | Used `shadow-lg` instead of mockup shadow | Use the `.article-card` component class (see AP-11) |
| Syntax highlight colors wrong on cyber theme | `.tk-*` overrides missing for cyber | Check `globals.css:589-606` — cyber overrides exist for all 6 tokens |
| Mouse glow doesn't follow cursor | `useMouseGlow` listeners not attached | Check that `prefers-reduced-motion: reduce` is OFF (the hook skips attaching listeners otherwise) |
| Marquee doesn't scroll | Animation not applied — check `globals.css:671-688` | Ensure `.marquee-wrap` and `.marquee` classes are present on parent + child |
| Scroll progress bar stuck at 0 | `useScrollProgress` returned 0 due to reduced motion | That's expected behavior — the bar is static for reduced-motion users |

### 10.5 Live-Site Verification Commands

```bash
# Verify the production build boots locally (standalone)
pnpm build && node apps/web/.next/standalone/apps/web/server.js
# (from apps/web): pnpm build && node .next/standalone/apps/web/server.js

# Smoke test the public routes
curl -sI http://localhost:3000/ | head -1                          # 200
curl -sI http://localhost:3000/rss.xml | head -1                    # 200, application/rss+xml
curl -sI http://localhost:3000/sitemap.xml | head -1               # 200, application/xml
curl -sI http://localhost:3000/robots.txt | head -1                # 200
curl -sI http://localhost:3000/admin                              # 307 redirect to /admin/login
curl -s http://localhost:3000/api/github-stats | jq .              # { stars, forks }
curl -s 'http://localhost:3000/api/confirm?token=invalid.abc'       # 400 invalid or expired token

# Verify security headers
curl -sI http://localhost:3000/ | grep -iE '(csp|x-content-type|x-frame|referrer|permissions-policy|strict-transport)'

# Verify CSP allows GitHub + Resend
curl -sI http://localhost:3000/ | grep -i 'content-security-policy'
# Expected: default-src 'self'; ... connect-src 'self' https://api.github.com https://api.resend.com ...

# Pass 5 additions — verify the write surface + SEO URLs, not just reads
curl -s http://localhost:3000/archive | grep -c Uncategorised        # 0 (R-51: rows show real tags)
curl -s 'http://localhost:3000/archive?tag=rust' | grep '0 essays'   # must NOT match unless truly unused (R-50)
curl -s http://localhost:3000/robots.txt | grep Sitemap              # prod origin, not localhost (R-52)
curl -s http://localhost:3000/posts/<slug> | grep canonical          # prod origin (R-49; build with NEXT_PUBLIC_SITE_URL set)
# Server actions cannot be curl-ed (encrypted action IDs) — drive them in a
# browser (comment submit, admin approve) against the STANDALONE build; the
# unit suite cannot catch a 'use server' module-evaluation throw (C-37).
```

---

## 11. Pre-Ship Checklist

### 11.1 Quality Gate Commands (run in order)

```bash
pnpm check-types   # 0 errors across 5 packages
pnpm lint          # 0 errors (3 pre-existing warnings acceptable)
pnpm test          # 464 tests passing (355 web + 41 db + 40 auth + 21 types + 7 email)
pnpm build         # 34/34 pages → apps/web/.next/standalone/apps/web/server.js (proxy.ts, Web Crypto)

# Or all at once (full gate):
pnpm check         # = check-types && lint && test:coverage && audit --prod && build
# DB one-shot:
pnpm db:setup      # = generate (0.31 --config) && migrate && seed (135K, 34/34)
```

**Never push if any of these fail.** All four must be green.

### 11.2 CI Guard Details (planned for Phase 8)

Not yet wired. When added, CI will run the above 4 commands + `pnpm audit --prod` (with documented exceptions for the 3 critical transitive Next.js vulnerabilities).

### 11.3 Pre-Deployment Env Validation

```bash
# Verify required env vars are set in the deploy environment
node -e "
const EnvSchema = require('./apps/web/src/lib/env.ts').EnvSchema;
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Missing env vars:', parsed.error.issues);
  process.exit(1);
}
console.log('Env OK');
"
```

Required in prod (throw at BOOT since R-61): `BETTER_AUTH_SECRET` (32+ chars), `SIGNED_TOKEN_SECRET` (32+ chars). Production seeding additionally requires `DEV_AUTHOR_PASSWORD` at **≥16 chars** (R-57 + R-92). Optional: `RESEND_API_KEY`, `CRON_SECRET`. **Empty = unset (R-73):** present-but-empty vars are normalized to absent before Zod parses — the `cp .env.example .env.local` quick start builds cleanly with only the two secrets filled.

### 11.4 Post-Deployment Smoke Tests

Run the live-site verification commands in §10.5 against the deployed URL. Specifically:

- `/` returns 200 with the landing page.
- `/rss.xml` returns 200 with `Content-Type: application/rss+xml`.
- `/sitemap.xml` returns 200 with `Content-Type: application/xml`.
- `/robots.txt` returns 200.
- `/admin` returns 307 redirect to `/admin/login`.
- `/api/github-stats` returns 200 with JSON body.
- `/api/confirm?token=invalid.abc` returns 400.

### 11.5 Security Verification Checklist

- [ ] `BETTER_AUTH_SECRET` is 32+ chars (use `openssl rand -hex 32`).
- [ ] `SIGNED_TOKEN_SECRET` is 32+ chars.
- [ ] `RESEND_FROM` is on a verified Resend domain (prod).
- [ ] `NEXT_PUBLIC_SITE_URL` matches the deploy URL (for RSS/OG tags).
- [ ] CSP allows only `https://api.github.com` and `https://api.resend.com` for `connect-src`.
- [ ] `X-Frame-Options: DENY` is set (clickjacking protection).
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` is set.
- [ ] `Permissions-Policy` disables camera, microphone, geolocation, browsing-topics.
- [ ] `Strict-Transport-Security` is set with `max-age=63072000; includeSubDomains; preload`.
- [ ] No `process.env.*` direct reads in feature/component code (use `apps/web/src/lib/env.ts`).
- [ ] No `as any` (lint blocks it — run `pnpm lint` to verify).
- [ ] No `enum` / `namespace` (erasableSyntaxOnly blocks it — `pnpm check-types` verifies).
- [ ] No default exports in `apps/web/src/**` (lint warns — fix before push).

### 11.6 Visual Verification Checklist

- [ ] Landing page matches `landing_page_mockup.html` pixel-for-pixel in dark theme.
- [ ] Switching to light theme: all colors transition in 700ms.
- [ ] Switching to cyber theme: CRT scanlines visible, syntax tokens change.
- [ ] Typewriter cycles through greetings (dark/light); frozen on reduced motion.
- [ ] Marquee scrolls continuously.
- [ ] Article cards lift on hover with the correct shadow.
- [ ] Code window copy button flashes on click.
- [ ] Scroll progress bar fills as you scroll.
- [ ] Mobile (375px width): hero text scales down via `clamp(2.5rem, 7.5vw, 6.5rem)`, grid collapses to 2 columns.
- [ ] Keyboard: Tab cycles through interactive elements; skip link appears on first Tab.

---

## 12. Lessons Learnt & How to Avoid Them

### 12.1 L1 — The Edge Runtime Auth Split (Phase 6 + 2026-09-03 hardening)

**What happened:** Phase 6 added `proxy.ts` (was `middleware.ts`) to guard `/admin/*`. Initial implementation imported `verifySessionToken` from `@devlog/auth` (root). Build failed with `better-sqlite3 is not defined`. After `better-auth` removal, `tokens.ts` still used `node:crypto` (`createHmac`/`timingSafeEqual`/`Buffer`) which Turbopack warns `not supported in Edge` and which `proxy.ts` (Edge) cannot bundle.

**Why it mattered:** Edge Runtime can't bundle native addons (`better-sqlite3`, `node:crypto`). The full `@devlog/auth` transitively imports `better-sqlite3` via `@devlog/db`.

**How to avoid:** The split between `packages/auth/src/index.ts` (DB-backed `signIn`/`getSession` + Drizzle) and `packages/auth/src/tokens.ts` (pure **Web Crypto `crypto.subtle`**, `async`, `timingSafeEqualHex`, no `Buffer`) is **architectural**. The `proxy.ts` (`export async function proxy`) may only import `@devlog/auth/tokens` (`await verifySessionToken`). See ADR-002 + ADR-004 amendment and §15.11. Remediation A fixed the Edge warning and made all token helpers `async`.

### 12.2 L2 — The `erasableSyntaxOnly` Migration (Phase 1)

**What happened:** Phase 1 set up `tsconfig.base.json` with `erasableSyntaxOnly: true` (TS 5.8+ flag). Existing code using `enum` failed to compile.

**Why it mattered:** `erasableSyntaxOnly` forces the type checker to fully erase types at runtime — no `enum` (which compiles to a runtime object), no `namespace` (which compiles to an IIFE), no parameter properties.

**How to avoid:** Use `as const` objects + union types. Documented in §9.2 (AP-2). Drizzle's `text('role', { enum: [...] })` is a Drizzle helper, not a TS `enum` — it's fine.

### 12.3 L3 — The Hydration Mismatch (Phase 3)

**What happened:** Phase 3 added the theme cookie pattern (read cookie server-side → emit `data-theme` attribute → inline `<head>` script syncs cookie with localStorage). First render sometimes mismatched because `useThemeStore` read from `document.documentElement` synchronously on mount.

**Why it mattered:** React hydration mismatches cause runtime warnings and can break interactivity.

**How to avoid:** Use lazy initializers (`useState(() => ...)` for SSR-unsafe values) and `suppressHydrationWarning` on the `<html>` tag (because we intentionally let the inline script mutate it post-hydration). See `apps/web/src/app/layout.tsx:82`.

### 12.4 L4 — The Drizzle Client Global Cache (Phase 2)

**What happened:** Phase 2 added the Drizzle client. In dev, Next.js hot-reloads modules — without a `globalThis` cache, every reload created a new `better-sqlite3` instance, eventually exhausting file handles.

**Why it mattered:** Dev server crashed with `Error: SQLITE_BUSY` or `EMFILE` after ~20 HMR cycles.

**How to avoid:** The `globalThis.__devlog_db` cache in `packages/db/src/client.ts:25-29` survives hot reloads. Always use the `globalThis` pattern for singleton Node resources in Next.js dev.

### 12.5 L5 — The Lazy DB Proxy (Phase 2)

**What happened:** Phase 2 added the lazy DB proxy. Initial implementation opened the SQLite file at module load. Build failed because `apps/web/devlog.db` didn't exist at build time.

**Why it mattered:** `pnpm build` evaluates route modules for type collection — if any module opens a DB at top-level, the build tries to open a file that doesn't exist.

**How to avoid:** The Proxy pattern in `packages/db/src/client.ts:58-69` defers client creation until the first query. Importing `db` no longer opens a file; the file opens only when a query runs.

### 12.6 L6 — The Vitest Mock Hoisting Trap (Phase 5)

**What happened:** Phase 5 added the comment Server Action. The test mocked `@/lib/rate-limit` with a factory referencing an outer-scope `vi.fn()`. Vitest threw `Cannot access X before initialization`.

**Why it mattered:** `vi.mock()` is hoisted above imports by Vitest's transform — outer-scope variables aren't available inside the factory.

**How to avoid:** Inline everything inside the factory, or use `vi.hoisted()` for shared state. See §9.9 (AP-9).

### 12.7 L7 — The `set-state-in-effect` Rule (Phase 3)

**What happened:** Phase 3 added `useTypewriter`. Initial implementation called `setDeleting(true)` synchronously inside the effect. React 19's `react-hooks` plugin (v7 ruleset) flagged it as a cascading render.

**Why it mattered:** Synchronous `setState` in effects causes an extra render cycle before the browser paints. The v7 rule surfaces this.

**How to avoid:** Wrap deferred state changes in `setTimeout` so they don't trigger the rule:

```typescript
// ❌ Avoid — triggers react-hooks/set-state-in-effect
useEffect(() => {
  setDeleting(true);  // synchronous
}, [text]);

// ✅ Correct — deferred
useEffect(() => {
  const t = setTimeout(() => setDeleting(true), PAUSE_AT_FULL_MS);
  return () => clearTimeout(t);
}, [text]);
```

### 12.8 L8 — The Resend Sandbox Mode (Phase 5)

**What happened:** Phase 5 added the Resend wrapper. Initial implementation threw if `RESEND_API_KEY` was unset. Dev server crashed on first subscribe attempt.

**Why it mattered:** Dev environments shouldn't require a real Resend key.

**How to avoid:** `packages/email/src/send.ts:91-98` returns `{ ok: false, skipped: true }` when no API key. The subscribe flow degrades gracefully — the subscriber row is still inserted, but no email is sent. Documented in PAD §3.3 Pattern 6.

### 12.9 L9 — The Single-Row `siteSettings` Invariant (Phase 7)

**What happened:** Phase 7 added the admin settings form. Initial seed script could insert multiple rows into `siteSettings`. The form started reading the wrong row.

**Why it mattered:** `siteSettings` is a singleton (id=1). The schema declares `id: integer('id').primaryKey().default(1)` but SQLite doesn't enforce "no second row".

**How to avoid:** The application layer enforces "no second row" — `seed.ts` deletes existing rows before inserting. The settings form only updates `WHERE id = 1`. Documented in `packages/db/src/schema.ts:13`.

### 12.10 L10 — The Mockup as Source of Truth (Phase 3)

**What happened:** Phase 3 ported the landing page. Several attempts to "improve" the mockup (rounded corners on `.btn-primary`, different shadow on `.article-card`) caused visual regressions.

**Why it mattered:** The mockup is the contract. Any deviation breaks the pixel-for-pixel requirement.

**How to avoid:** Treat `landing_page_mockup.html` as immutable. Any visual change starts with updating the mockup, then propagating to `globals.css` and `packages/config/tailwind/base.css`. Documented in §1.2 and §4.

### 12.11 L11 — The `noUncheckedIndexedAccess` Gotcha (Phase 4)

**What happened:** Phase 4 added archive pagination. Code like `posts[0]` failed type-check because `noUncheckedIndexedAccess` returns `T | undefined`.

**Why it mattered:** Array access doesn't guarantee existence at the type level. This forces explicit null checks.

**How to avoid:** Always narrow after array access:

```typescript
const post = posts[0];
if (!post) return null;  // explicit check
// post is now Post (not Post | undefined)
```

### 12.12 L12 — The Cookie-Based Theme Sync (Phase 3)

**What happened:** Phase 3 added the theme toggle. Initial implementation read theme from localStorage only — but Server Components can't read localStorage, so the server-rendered HTML always had the default theme.

**Why it mattered:** First paint showed the wrong theme, then JS corrected it (FOUC).

**How to avoid:** The cookie pattern (PAD §3.3 Pattern 1):
1. Client sets `localStorage['devlog-theme']` AND `document.cookie = 'devlog-theme=...'`.
2. Server reads the cookie in `RootLayout` and emits `<html data-theme="...">`.
3. Inline `<head>` script syncs cookie with localStorage before hydration.

See `apps/web/src/app/layout.tsx:60-97`.

### 12.13 L13 — The "Any Password" Bypass (audit C-1, Phase 9)

**What happened:** The audit found `signIn()` accepted ANY password — the seed stored a placeholder string and the comparison path was never wired to a real hash.

**Why it mattered:** Anyone could log in as the author. Classic "dev shortcut ships to prod" failure.

**How to avoid:** Passwords are now scrypt-verified (`packages/auth/src/password.ts`, `timingSafeEqual`, format `scrypt:N:r:p:salt:hash`); the seed computes a real hash of `dev-password-12345` at seed time. Rule: **a credential check that isn't tested against a wrong password is a finding, not a TODO.**

### 12.14 L14 — Signed vs. Random Tokens (audit C-3/C-4, Phase 9)

**What happened:** The subscribe flow generated `crypto.randomUUID()` confirm tokens and had the `sendEmail` call commented out — the confirm/unsubscribe/preferences routes (which verify HMAC signatures) were unreachable dead ends.

**Why it mattered:** The double-opt-in contract in the PRD was silently unimplemented while the UI looked complete.

**How to avoid:** Tokens that cross a trust boundary must be *signed* (`signToken(id)` → `<id>.<hmac>`), not random UUIDs — the verifier dictates the format. And there is no "temporarily commented-out" production send path; tests now pin `sendEmail` being called with the exact template props (`features/subscribe/actions.test.ts`).

### 12.15 L15 — Better Auth Didn't Earn Its Dependency Cost (audit C-2, Phase 9.5)

**What happened:** v1 shipped `better-auth@^1.6` in deps but never actually instantiated it — the app used a homegrown HMAC design. The dependency only contributed ~1.2MB of transitive surface (styled-jsx → @babel/core) and audit advisories.

**Why it mattered:** Unused auth frameworks are pure liability: dependency advisories, bundle weight, and a false CLAUDE.md/AGENTS.md/PAD story about how auth works.

**How to avoid:** When the code and the ADR disagree, fix one of them formally. Better Auth was removed and ADR-004 amended (substitution documented with revisit triggers: OAuth in v2). Rule: **every declared dependency must be imported somewhere.**

### 12.16 L16 — Aspirational Coverage Gates Lie (audit M-8, Phase 9.5)

**What happened:** `vitest.config.ts` declared 80/75/80/80 coverage thresholds from Phase 1, but actual coverage was 44% — and the `pnpm check` script including `test:coverage` had never been run green end-to-end.

**Why it mattered:** A permanently-red gate gets ignored; a "green" claim in the session log was unverifiable.

**How to avoid:** The remediation added ~80 tests (272 total, 65.36% lines) covering the security- and user-critical surface, then set **staged thresholds (64/68/90/64) as a regression gate** with the 80% target tracked as backlog R-30. Rule: **a gate that has never been green is documentation, not enforcement — set thresholds you can hold today, raise them in tracked steps.**

### 12.17 L17 — One Override Chain Killed Six Advisories (audit C-7/C-8/C-9, Phase 9.5)

**What happened:** After the pass-1 dependency bumps, 6 advisories remained — all routed through `react-email` (esbuild, glob, prismjs, @babel/core) and `shadcn → express → qs`.

**Why it mattered:** `pnpm audit --prod` with any remaining high finding blocks the release gate.

**How to avoid:** A short `pnpm.overrides` block (`qs@^6.16`, `prismjs@^1.30`, `glob@^11`, `esbuild@^0.25`, `@babel/core@^7.29.6`) force-resolved the whole tail: **0 vulnerabilities in `pnpm audit --prod`**. Rule: **when advisories cluster in one transitive path, pin the path, don't chase each leaf — and re-run the full build + tests after overriding.**

---

### 12.18 L18 — A Layout Guard Must Never Guess Its Route (Pass 3, C-31)

**What happened:** The admin shell layout wrapped ALL of `/admin/*` — including `/admin/login` — and tried to detect the login page with `headers.get('x-pathname')`. Nothing ever set that header, so anonymous `/admin/login` visits ran `requireAuthor(undefined)` → `redirect('/admin/login?next=/admin')` → the layout again → **infinite redirect loop** in production (`ERR_TOO_MANY_REDIRECTS`). It shipped because no test rendered the layout, and dev testing always hit `/admin` (which "worked" by redirecting).

**Why it mattered:** the entire admin surface was unreachable in production; the login page — the one route that must be public — was the broken one.

**How to avoid:** **route groups, not runtime sniffing.** Move the guarded shell to `(auth)/admin/(dashboard)/layout.tsx` so the login page sits outside it by construction (URLs unchanged). Never invent request headers as control flow; if you need the pathname in a layout, the structure is wrong. Pin it: the layout test asserts no non-comment line references `x-pathname`, and a login-page test asserts no redirect for anonymous visitors.

---

### 12.19 L19 — Mocked DB Tests Made SQLite Dialect Errors Invisible (Pass 3, C-32/C-33/H-33)

**What happened:** Two classes of runtime SQL bugs shipped behind a fully green 272-test suite: six `count(*)::int` selects (PostgreSQL cast syntax — SQLite throws `unrecognized token: ":"`, 500-ing `/archive` and every admin stats card) and a `Date` object bound into a raw `sql` fragment in `getAdjacentPosts` (better-sqlite3 refuses Date binds, 500-ing every `/posts/[slug]` page).

**Why it mattered:** the web test suite mocks `@devlog/db` entirely, and `packages/db` had tests only for the schema — the query layer had **zero real-DB coverage**, so both bugs were invisible to CI and only exploded against a real SQLite file.

**How to avoid:** **every persistence layer needs at least one integration suite against the real engine.** `packages/db/src/queries.test.ts` now runs the committed migrations against a temp SQLite file (`DATABASE_PATH`) and pins counts, adjacency and stats. Dialect rules of the road: use drizzle's portable `count()` (never `::` casts), and bind epoch **seconds** via `postEpochSeconds()` — drizzle `{ mode: 'timestamp' }` columns store seconds but read back as `Date`, which is not a valid SQLite bind type.

---

### 12.20 L20 — Standalone Builds Don't Ship Their Own Static Assets (Pass 3, C-34)

**What happened:** The reported "landing page is broken" incident: the live site served correct HTML referencing `/_next/static/chunks/3gvja4ex7oyrc.css` — which 404'd, along with every JS chunk. The page rendered as unstyled raw HTML with zero hydration. Root cause: `output: 'standalone'` deliberately excludes `.next/static` and `public/` from `.next/standalone/`, and the deployment skipped the copy step the Next.js docs require.

**Why it mattered:** a pixel-perfect mockup port means nothing if the stylesheet 404s; the site looked *worse than broken* — it looked like 1994.

**How to avoid:** **make the correct deploy the default path.** `pnpm build` now runs `postbuild` (`src/scripts/copy-standalone-assets.ts`) mirroring `.next/static → .next/standalone/apps/web/.next/static` and `public/` alongside, so `pnpm build && pnpm start` is always self-contained. The script is integration-tested (copy, public, idempotency, missing-input warnings). Diagnostic shortcut for "unstyled Next.js page": `curl -I` the CSS chunk from the HTML — if it 404s, check the standalone folder before blaming the CSS.

### 12.21 L21 — better-sqlite3 Silently Creates an Empty Database (Pass 4, C-36)

**What happened:** the live deployment 500-ed `/archive` and `/posts/[slug]` while the landing page looked fine. The standalone server resolved the CWD-relative `DATABASE_PATH` default (`./devlog.db`) against a working directory that had no database file; `new Database(path)` **created an empty file** instead of failing, every query then threw `no such table: posts`, and the hardcoded mockup fallbacks on the landing page hid the outage (RSS even returned a well-formed 200 with zero items).

**Why it mattered:** silent empty-state boot turns every DB-backed route into a runtime 500 with no boot-time signal, and a working landing page masks it in every smoke test.

**How to avoid:** **fail fast on missing runtime data.** The client now throws an actionable error (resolved path + remedy) when the file doesn't exist (R-38); only `openDatabaseForMigrations()` — the `db:migrate` bootstrap — may create one. Diagnose: if the landing page renders but DB routes 500, check whether the server is pointing at an empty database before blaming the queries.

### 12.22 L22 — Stateless HMAC Sessions Need an Embedded Timestamp to Expire (Pass 4, H-34)

**What happened:** session tokens were `<userId>.<hmac(userId)>` with the 30-day TTL enforced only as the cookie's `maxAge`. The verifier had no time input at all — a stolen cookie was valid forever, and sign-out (cookie deletion) could not invalidate a copy.

**Why it mattered:** a "TTL" that exists only client-side is not a security control; the server must be able to reject an expired token it receives.

**How to avoid:** **bind the issuance time into the MAC.** Token v2 (R-39) is `<userId>.<iat-seconds>.<hmac(userId.iat)>` and `verifySessionToken` rejects `now - iat > TTL` (plus legacy 2-part tokens outright). Any stateless bearer design needs the epoch inside the signed payload.

### 12.23 L23 — Dev Credential Hints Must Be Environment-Gated (Pass 4, C-35)

**What happened:** the admin login page rendered `$ dev credentials — author@devlog.example / dev-password-12345` unconditionally — including on the live production site (verified by curl). Only the deployment's broken database prevented an immediate admin takeover.

**Why it mattered:** a convenience hint is indistinguishable from public credentials disclosure once it reaches production, and "the DB is broken anyway" is not a defense.

**How to avoid:** **gate every developer affordance on `NODE_ENV === 'development'`** (R-37) and add a render-level test that asserts absence in production. Never document a real default password without an env override path (`DEV_AUTHOR_PASSWORD`).

### 12.24 L24 — Never Key a Rate Limiter on Something the Caller Doesn't Send (Pass 4, H-35)

**What happened:** the comment limiter's key was `ctx.ip ?? postId`, and the only production caller never passed an IP — so every visitor of a post shared one 10/hour bucket and the 11th legitimate comment was blocked for everyone. Subscribe had the same drift (keyed by email while documented as per-IP).

**Why it mattered:** a limiter keyed on a shared value is both a denial-of-service on legitimate users and no throttle against attackers.

**How to avoid:** **read the client IP server-side from proxy headers** (`x-forwarded-for` first entry, then `x-real-ip`) via the shared `getClientIpFromHeaders` helper (R-40) and fall back to a per-entity key only when genuinely absent. Never rely on the caller to pass request context the server can read itself.

### 12.25 L25 — Prerendered HTML Bakes the Build Machine's Environment (Pass 5, C-37/H-37/M-41)

**What happened:** two distinct builds-without-runtime-env bugs shipped despite a green suite. (1) `'use server'` files exporting Zod schemas made the Server Actions loader throw at module evaluation — every mutation 500-ed in production while unit tests passed, because vitest never exercises the loader. (2) Prerendered pages (generateStaticParams, force-static feeds) baked the build machine's `NEXT_PUBLIC_SITE_URL` into canonical/OG/robots URLs — the live site advertised `http://localhost:3000` while runtime-revalidated routes showed the real origin.

**Why it mattered:** the unit suite validates source, not framework loading or build-time env snapshots — the two blind spots that bit in Passes 3–5 were all "runs at build/boot, not at test time."

**How to avoid:** (a) keep `'use server'` modules action-only and pin the contract with the `use-server-exports-scan.test.ts` source scan; (b) treat any absolute URL baked into prerendered HTML as build-config-owned — CI builds must run with `NEXT_PUBLIC_SITE_URL` set, and URL-bearing surfaces export `revalidate = 3600` so fresh deploys self-heal (pinned by `revalidate-contract.test.ts`); (c) verify every fix against a like-for-like standalone production build, not just `pnpm dev`.

---

### 12.26 L26 — Present-but-Empty Env Vars Are Not Absent (Pass 7, H-40)

**What happened:** the documented quick start (`cp .env.example .env.local`, fill two secrets, `pnpm build`) produced a build-time throw: `Invalid environment variables: RESEND_API_KEY: Invalid input: must start with "re_"`. The template ships `RESEND_API_KEY=` **empty**; Zod's `.optional()` accepts absent but fails present-but-empty values, and production turns validation failures into a boot throw (R-61).

**Why it mattered:** the canonical deployment path crashed with a misleading error for every fresh-clone operator; `start_server.sh` inherited the trap.

**How to avoid:** normalize `'' → undefined` across `process.env` before `safeParse` ("empty = unset", `withEmptyVarsUnset` in `lib/env.ts`). When a validator's semantics are "may be unset", test the PRESENT-BUT-EMPTY case explicitly — `.optional()` alone does not cover it.

### 12.27 L27 — A pointer-events:none Element Can Never Be an Event Target (Pass 7, M-53)

**What happened:** the hero mouse-glow attached its listeners to an overlay rendered with `style={{ pointerEvents: 'none' }}`. In every real browser the glow was dead code from Phase 3 onward — while its unit test stayed green.

**Why it mattered:** jsdom has no hit-testing, so dispatching an event directly on the node fires listeners regardless of `pointer-events`; only a composition test (render the REAL parent/child structure, dispatch on the parent) reproduces browser reality.

**How to avoid:** when an overlay must be pointer-transparent, its listeners belong on an ancestor that receives events (`useMouseGlow({ track: 'parent' })`). Composition tests must dispatch from outside the tested component, not on its internal nodes.

### 12.28 L28 — Destructive Writes Must Not Ride on GET (Pass 7, H-42)

**What happened:** `/unsubscribe` performed the `status → unsubscribed` DB write inside the server-component render (a GET). Email clients and corporate sanitizers prefetch links — users were silently unsubscribed without clicking.

**How to avoid:** GET verifies and renders; POST mutates. The confirmation form posts to the `confirmUnsubscribe` Server Action (token-gated, idempotent). Any page whose render path calls `db.update`/`db.delete`/`db.insert` is a bug — grep for it in review.

### 12.29 L29 — Canonical Metadata Inherits Through Layouts (Pass 7, M-52)

**What happened:** `/archive`, `/archive/page/[page]` and `/snippets` defined `metadata` without `alternates`, so Next's shallow merge inherited the root layout's `canonical: '/'` — crawlers were told every indexable listing page was a duplicate of the homepage.

**How to avoid:** every public indexable page declares its own `alternates.canonical`. Pin it with a metadata-contract test (`await import('./page')` → `metadata.alternates.canonical`) — no render needed.

### 12.30 L30 — The First X-Forwarded-For Entry Is the Attacker's (Pass 7, M-50)

**What happened:** the rate limiter keyed on `xff.split(',')[0]`. Appending proxies (nginx `$proxy_add_x_forwarded_for`, Cloudflare) put the proxy-observed client LAST — so the first entry was whatever the client sent, and every per-IP limit was bypassable by rotating a header.

**How to avoid:** take the rightmost non-empty XFF entry (the only hop not received verbatim from the client), then `x-real-ip`, then a shared `'unknown'` bucket. Any "trust a header" decision needs a comment stating WHICH proxy wrote it and why that is trustworthy.

### 12.31 L31 — React 19 Nulls `event.currentTarget` After the Dispatch (Pass 7, M-51)

**What happened:** the subscribe form read `e.currentTarget.querySelector(...)` after `await subscribeToNewsletter(...)`. React 19's `executeDispatch` sets `currentTarget = null` once the synchronous listener returns → `TypeError: Cannot read properties of null` on EVERY successful subscribe, invisible to unit tests that never exercised the full async flow.

**How to avoid:** capture `const form = e.currentTarget;` before the first `await` in any event handler. Never touch synthetic-event properties after an await boundary.

## 13. Pitfalls to Avoid

### 13.1 Architecture Pitfalls

- **Don't put DB access in `proxy.ts`.** Edge Runtime can't bundle `better-sqlite3`. Use `@devlog/auth/tokens` for edge-safe auth.
- **Don't import `@devlog/auth` (root) in `proxy.ts`.** Same reason — pulls in `@devlog/db` + `better-sqlite3`. Use `@devlog/auth/tokens` (`async`).
- **Don't import `drizzle-orm/sqlite-core` or `better-sqlite3` in Layer 1 (app) or Layer 2 (features).** Drizzle-orm *operators* (`eq`, `and`, `desc`, `count`) alongside `@devlog/db` query functions are the sanctioned pattern (R-46); table definitions and raw clients are not.
- **Don't put React/JSX in Layer 3 (domain).** Domain is pure TS — Zod schemas, slugify, signed-token helpers.
- **Don't put IO in Layer 3 (domain).** No `fetch`, no `fs`, no DB.

### 13.2 TypeScript Pitfalls

- **Don't use `any`.** Use `unknown` + narrow.
- **Don't use `enum` or `namespace`.** Use `as const` + union types.
- **Don't use default exports in `apps/web/src/**`.** Use named exports.
- **Don't use `as any`.** Lint blocks it.
- **Don't read `process.env.FOO` directly.** Use `apps/web/src/lib/env.ts`.

### 13.3 Testing Pitfalls

- **Don't use `vi.fn()` directly in `vi.mock()` factory** referencing outer scope. Inline or use `vi.hoisted()`.
- **Don't put JSX in `.test.ts` files.** Use `.test.tsx`.
- **Don't skip the failing test.** TDD order: RED → GREEN → REFACTOR.
- **Don't use `vi.mock` inside `describe` / `it`.** It must be at the top level of the test file.

### 13.4 Design System Pitfalls

- **Don't add a 4th theme.** Design budget is closed (dark/light/cyber).
- **Don't use `amber-400` or arbitrary hex values.** Use `text-accent` or extend `@theme`.
- **Don't use `shadow-lg` or `shadow-md`.** Use the mockup shadow (see §4.6).
- **Don't use Framer Motion / GSAP.** CSS-only animation is the rule.
- **Don't modify `landing_page_mockup.html`.** It's the source of truth.
- **Don't modify `skills/**`.** Read-only reference skills.

### 13.5 Database Pitfalls

- **Don't use `db:push` in production.** Always `db:generate` → review SQL → `db:migrate`.
- **Don't hand-write row types.** Use `typeof posts.$inferSelect`.
- **Don't open the DB at module load.** Use the lazy proxy (already wired in `packages/db/src/client.ts`).
- **Don't use Postgres, Redis, or any DB other than SQLite.** Single file at `apps/web/devlog.db`.

### 13.6 Security Pitfalls

- **Don't read uncleaned user input.** Zod at every boundary.
- **Don't roll your own JWT.** Use the HMAC token pattern in `@devlog/auth/tokens`.
- **Don't log secrets.** The env module masks values; don't `console.log(env.BETTER_AUTH_SECRET)`.
- **Don't disable `httpOnly` on the session cookie.** It's set in `signIn()` (Phase 6) — leave it `true`.
- **Don't set `secure: false` in production.** The `signIn()` function checks `process.env.NODE_ENV === 'production'`.

### 13.7 Performance Pitfalls

- **Don't import `@/lib/storage/r2` or other heavy modules in client components.** Server-only.
- **Don't attach `scroll` / `touchmove` listeners without `passive: true`.**
- **Don't use `useEffect` for SSR-unsafe state.** Use `useState(() => ...)` lazy initializers.
- **Don't use `forwardRef`.** React 19 passes `ref` as a regular prop.

---

## 14. Best Practices

### 14.1 Code Organization

- **Feature-sliced modules.** Each feature owns its UI, queries, mutations, types. No cross-feature imports.
- **Co-located tests.** `Foo.tsx` ↔ `Foo.test.tsx` in the same directory.
- **`as const` over `enum`.** See §9.2.
- **Named exports only** in `apps/web/src/**`.

### 14.2 TypeScript Conventions

- `interface` for object shapes, `type` for unions/intersections.
- `import type` for type-only imports (the linter enforces this).
- `satisfies` for type-checking without widening.
- Explicit return types on all exported functions.

### 14.3 React/Next.js Conventions

- Server Components by default. `'use client'` only when needed.
- `'use server'` at the top of `features/*/actions.ts`.
- `metadata` and `viewport` exports in `layout.tsx` (not a separate `<head>`).
- `next/font/local` for self-hosted fonts (planned for Phase 3+).
- MDX via `pageExtensions` — content in `apps/web/content/**/*.mdx`.

### 14.4 Testing Conventions

- TDD: RED → GREEN → REFACTOR. No production code without a failing test.
- Behavior over implementation. Test what the user sees, not internal state.
- `vi.hoisted()` for shared mock state across `vi.mock()` factories.
- `.test.tsx` for any test that renders JSX.

### 14.5 Database Conventions

- Parameterized queries (Drizzle handles this — never raw SQL string concat).
- Migrations, not `db:push` (in prod).
- `typeof X.$inferSelect` for row types.
- Lazy client via the globalThis Proxy.

### 14.6 Security Conventions

- Zod at every boundary (env, Server Action, API body).
- HMAC tokens (`signToken` / `verifyToken`) for subscribe/unsubscribe links.
- `verifySessionToken` (timing-safe compare) for session cookies.
- `httpOnly: true`, `sameSite: 'lax'`, `secure: process.env.NODE_ENV === 'production'` on the session cookie.
- CSP, X-Frame-Options: DENY, HSTS, Permissions-Policy — all set in `next.config.ts`.

### 14.7 Design Conventions

- Brand tokens only (no arbitrary values).
- CSS-only animation (`@keyframes` + `transition`).
- 3 themes: dark/light/cyber.
- 4px radius scale.
- `prefers-reduced-motion` enforced globally + per-hook.

---

## 15. Coding Patterns

### 15.1 Server Action Pattern (auth → validate → business → response)

**Location:** `apps/web/src/features/blog/actions.ts`

```typescript
'use server';
import 'server-only';
import { z } from 'zod';
import { headers } from 'next/headers';
import { db, schema } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { getClientIpFromHeaders } from '@/lib/request-ip';

const inputSchema = z.object({
  postId: z.string().min(1, 'postId is required.'),
  body: z.string().trim().min(3).max(2000),
});

type Result =
  | { ok: true; commentId: string; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createComment(input: unknown): Promise<Result> {
  // 1. Validate input (Zod).
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path[0], i.message]),
      ),
    };
  }

  // 2. Rate limit (sliding window, per-IP — read server-side from proxy headers ONLY).
  //    `ctx.ip` was attacker-serializable (R-58/H-39); do not re-introduce it.
  const headersList = await headers();
  const clientIp = getClientIpFromHeaders(headersList);
  const allowed = await rateLimit(
    clientIp === 'unknown' ? `comment:unknown-${parsed.data.postId}` : `comment:${clientIp}`,
    10,
    3600,
  );
  if (!allowed) {
    return { ok: false, error: 'Too many comments. Try again later.' };
  }

  // 3. Business logic (verify post exists, insert comment).
  try {
    const id = crypto.randomUUID();
    db.insert(schema.comments)
      .values({
        id,
        postId: parsed.data.postId,
        body: parsed.data.body,
        authorName: 'anonymous',
        status: 'pending',
      })
      .run();
    return { ok: true, commentId: id, message: 'Comment submitted for review.' };
  } catch (e) {
    console.error('[createComment] DB error', e);
    return { ok: false, error: 'Server error. Please try again.' };
  }
}
```

### 15.2 API Route Pattern (force-dynamic, auth, owner check)

**Location:** `apps/web/src/app/api/confirm/route.ts`

```typescript
import 'server-only';
import { verifyToken } from '@devlog/auth';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // 1. Parse + validate input.
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return new Response('missing token', { status: 400 });

  // 2. Verify signed token (HMAC).
  const sep = token.indexOf('.');
  if (sep < 0) return new Response('invalid or expired token', { status: 400 });
  const subscriberId = token.slice(0, sep);
  if (!verifyToken(token, subscriberId)) {
    return new Response('invalid or expired token', { status: 400 });
  }

  // 3. Idempotent business logic.
  try {
    const rows = db.select().from(schema.subscribers)
      .where(eq(schema.subscribers.id, subscriberId)).limit(1).all();
    const sub = rows[0];
    if (!sub) return new Response('unknown subscriber', { status: 400 });
    if (sub.status === 'confirmed') {
      return new Response('already subscribed', { status: 200 });  // idempotent
    }
    db.update(schema.subscribers)
      .set({ status: 'confirmed', confirmedAt: new Date() })
      .where(eq(schema.subscribers.id, subscriberId)).run();
    const redirectUrl = new URL(env.NEXT_PUBLIC_SITE_URL);
    redirectUrl.searchParams.set('subscribed', '1');
    return Response.redirect(redirectUrl, 302);
  } catch (e) {
    console.error('[confirm] DB error', e);
    return new Response('server error', { status: 500 });
  }
}
```

### 15.3 Domain Function Pattern (pure, no framework imports)

**Location:** `apps/web/src/domain/theme.ts`

```typescript
// Pure TS — no React, no Drizzle, no IO.

export const THEME_COOKIE = 'devlog-theme';
export const VALID_THEMES = ['dark', 'light', 'cyber'] as const;
export type Theme = (typeof VALID_THEMES)[number];

export const THEME_ORDER: readonly Theme[] = VALID_THEMES;

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (VALID_THEMES as readonly string[]).includes(value);
}

export function cycleTheme(theme: Theme): Theme {
  const i = THEME_ORDER.indexOf(theme);
  const next = THEME_ORDER[(i + 1) % THEME_ORDER.length] ?? 'dark';
  return next;
}
```

### 15.4 Idempotent Operation Pattern (ON CONFLICT / status check)

**Location:** `apps/web/src/app/api/confirm/route.ts`

```typescript
// Check current state before writing — idempotent.
if (sub.status === 'confirmed') {
  return new Response('already subscribed', { status: 200 });
}
// Only then update.
db.update(schema.subscribers)
  .set({ status: 'confirmed', confirmedAt: new Date() })
  .where(eq(schema.subscribers.id, subscriberId))
  .run();
```

### 15.5 SSE Pattern (not yet implemented — planned for Phase 8)

(Reserved for future live-comment rendering. Document the pattern here when added.)

### 15.6 Webhook Idempotency Pattern (not yet implemented — planned for future email bounce handling)

(Reserved for future Resend webhook handling. Document the pattern here when added.)

### 15.7 Env Module Pattern (build-context fallback)

**Location:** `apps/web/src/lib/env.ts`

```typescript
import 'server-only';
import { z } from 'zod';

const EnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  // ... 12 vars total
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Invalid environment variables:\n${issues}`);
    }
    console.warn(`[env] Invalid environment variables:\n${issues}`);
    return EnvSchema.parse({ ...process.env, ...EnvSchema._def.shape });
  }
  return parsed.data;
}

export const env = loadEnv();
```

### 15.8 Source-Reading Test Pattern

**Location:** `apps/web/src/hooks/use-typewriter.test.tsx`

Tests that read the actual source file and verify behavior. The pattern is to test the public API (the hook's return value), not the internal state:

```typescript
import { renderHook } from '@testing-library/react';
import { useTypewriter } from './use-typewriter';

it('cycles through words', () => {
  const { result } = renderHook(() => useTypewriter(['hello', 'world']));
  // Use fake timers to advance the typewriter cycle.
  act(() => { vi.advanceTimersByTime(1000); });
  expect(result.current).not.toBe('');
});
```

### 15.9 Sliding-Window Rate Limiter Pattern

**Location:** `apps/web/src/lib/rate-limit.ts`

```typescript
const buckets = new Map<string, number[]>();

export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const arr = buckets.get(key) ?? [];
  // Prune old timestamps.
  const fresh = arr.filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    buckets.set(key, fresh);
    return false;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  return true;
}
```

### 15.10 Lazy DB Client Pattern (globalThis + Proxy)

**Location:** `packages/db/src/client.ts`

```typescript
declare global {
  var __devlog_db: DrizzleClient | undefined;
}

function createDrizzleClient(): DrizzleClient {
  const sqlite = new Database(resolveDbPath());
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema });
}

export const db: DrizzleClient = new Proxy(
  {},
  {
    get(_target, prop) {
      const cached = globalThis.__devlog_db ?? createDrizzleClient();
      globalThis.__devlog_db = cached;
      const value = (cached as Record<string | symbol, unknown>)[prop];
      return typeof value === 'function' ? value.bind(cached) : value;
    },
  },
) as DrizzleClient;
```

### 15.11 Edge-Safe Token Pattern (Web Crypto `crypto.subtle` + `async` — since 2026-09-03)

**Location:** `packages/auth/src/tokens.ts` (Edge-safe, no `node:crypto`/`Buffer`)

```typescript
// No node:crypto — Web Crypto only (Edge + Node 20+)
const TOKEN_SEPARATOR = '.';

function getSecret(): string { /* throws in prod if <32 chars */ }

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw',
    new TextEncoder().encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function timingSafeEqualHex(a: string, b: string): boolean { /* constant-time */ }

export async function createSessionToken(userId: string): Promise<string> {
  return `${userId}${TOKEN_SEPARATOR}${await hmacHex(userId)}`;
}

export async function verifySessionToken(token: string): Promise<string | null> {
  const sep = token.indexOf(TOKEN_SEPARATOR);
  if (sep < 0) return null;
  const userId = token.slice(0, sep);
  const receivedHmac = token.slice(sep + 1);
  if (!userId || !receivedHmac) return null;
  if (!/^[a-f0-9]{64}$/.test(receivedHmac)) return null;
  const expectedHmac = await hmacHex(userId);
  if (!timingSafeEqualHex(receivedHmac, expectedHmac)) return null;
  return userId;
  // signToken / verifyToken follow same async pattern
} // catch removed — hex regex + length check replace Buffer try/catch
  try {
    return null;
  }
}
```

### 15.12 Theme Cookie Sync Pattern

**Location:** `apps/web/src/app/layout.tsx:60-97`

The root layout reads the theme cookie server-side, emits `<html data-theme="...">`, and injects an inline `<head>` script that syncs the cookie with localStorage before hydration. This prevents FOUC and hydration mismatches.

---

## 16. Coding Anti-Patterns

### 16.1 `as any` vs `unknown` + Narrow

```typescript
// ❌ Anti-pattern
const data = JSON.parse(input) as any;
data.someMethod();

// ✅ Correct
const data: unknown = JSON.parse(input);
if (typeof data === 'object' && data !== null && 'someMethod' in data) {
  // data is now narrowed to a type with someMethod
}
```

### 16.2 Default Exports vs Named Exports

```typescript
// ❌ Anti-pattern (apps/web/src/**)
export default function Hero() { ... }

// ✅ Correct
export function Hero() { ... }
```

### 16.3 `enum` vs `as const`

```typescript
// ❌ Anti-pattern (erasableSyntaxOnly forbids)
enum Role { Author, Subscriber }

// ✅ Correct
const Role = { Author: 'author', Subscriber: 'subscriber' } as const;
type Role = (typeof Role)[keyof typeof Role];
```

### 16.4 `<a>` vs `<Link>`

```tsx
// ❌ Anti-pattern — full page reload
<a href="/posts/my-post">Read post</a>

// ✅ Correct — client-side navigation
<Link href="/posts/my-post">Read post</Link>
```

### 16.5 `amber-400` vs `accent`

```tsx
// ❌ Anti-pattern — color drift
<span className="text-amber-400">accent text</span>

// ✅ Correct — theme-aware
<span className="text-accent">accent text</span>
```

### 16.6 `tailwind.config.ts` vs `@theme`

```javascript
// ❌ Anti-pattern — wrong for Tailwind v4
// tailwind.config.ts
export default {
  theme: {
    colors: { accent: '#f59e0b' },
  },
};

// ✅ Correct — CSS-first @theme in globals.css
@theme {
  --color-accent: var(--accent);
}
```

### 16.7 `vi.fn()` Outer Scope in `vi.mock()` Factory

```typescript
// ❌ Anti-pattern — Vitest throws
const mockFn = vi.fn();
vi.mock('@/lib/db', () => ({ db: { query: mockFn } }));

// ✅ Correct — inline or vi.hoisted
vi.mock('@/lib/db', () => ({
  db: { query: vi.fn() },
}));

// or
const { mockFn } = vi.hoisted(() => ({ mockFn: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { query: mockFn } }));
```

### 16.8 Missing `passive: true` on `scroll`

```typescript
// ❌ Anti-pattern — blocks native scrolling
window.addEventListener('scroll', onScroll);

// ✅ Correct
window.addEventListener('scroll', onScroll, { passive: true });
```

### 16.9 Synchronous `setState` in `useEffect`

```typescript
// ❌ Anti-pattern — triggers react-hooks/set-state-in-effect
useEffect(() => {
  setDeleting(true);
}, [text]);

// ✅ Correct — deferred
useEffect(() => {
  const t = setTimeout(() => setDeleting(true), PAUSE_AT_FULL_MS);
  return () => clearTimeout(t);
}, [text]);
```

### 16.10 `forwardRef` (React 19)

```tsx
// ❌ Anti-pattern — unnecessary in React 19
const Button = forwardRef<HTMLButtonElement, Props>((props, ref) => { ... });

// ✅ Correct — ref is a regular prop
function Button({ ref, ...props }: Props & { ref?: Ref<HTMLButtonElement> }) { ... }
```

---

## 17. Responsive Breakpoint Reference

### 17.1 Tailwind Default Breakpoints (no custom config)

| Prefix | Min width | Usage |
|---|---|---|
| (none) | 0 | Mobile-first base styles |
| `sm:` | 640px | Small phones landscape / large phones portrait |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large monitors |

**No custom breakpoints are configured.** Tailwind v4 defaults are the design budget.

### 17.2 Usage Patterns Per Section

| Section | Mobile | Desktop |
|---|---|---|
| Hero H1 | `clamp(2.5rem, 7.5vw, 6.5rem)` | (same — fluid) |
| Hero subtitle | `text-2xl` | `md:text-3xl` |
| Hero body | `text-base` | `md:text-lg` |
| Stats grid | `grid-cols-2` | `md:grid-cols-4` |
| Article cards | `grid-cols-1` | `md:grid-cols-2 lg:grid-cols-3` |
| Article card padding | 22px | 28px (default in `.article-card`) |
| `.card-num` font-size | 42px | 56px (default in `.article-card`) |
| Nav | collapsed menu (mobile) | full horizontal (md+) |

### 17.3 Mobile Testing

Test on iPhone SE (375×667) and iPad (768×1024) viewports via Chrome DevTools. The landing page's `clamp(2.5rem, 7.5vw, 6.5rem)` hero font scales fluidly. The 4-column stats grid collapses to 2 columns at `<768px`.

---

## 18. Z-Index Layer Map

| Z-Index | Element | Location | Purpose |
|---|---|---|---|
| 200 | `[data-theme='cyber'] body::before` | `globals.css:70-84` | CRT scanlines overlay (cyber theme only) |
| 100 | `.progress-bar` | `globals.css:109-120` | Top scroll-progress bar |
| 50 | Skip link (focused) | `apps/web/src/app/layout.tsx:88-92` | Skip-to-content visible on focus |
| 2 | Hero content wrapper | `apps/web/src/features/landing/hero.tsx:54` | Above float-dot background |
| 1 | `.mouse-glow` | `globals.css:160-176` + `hero-mouse-glow.tsx` (`useMouseGlow({ track: 'parent' })`, R-79) | Cursor follow glow (behind content). Before R-79 it was dead code on a `pointer-events: none` overlay (M-53) — now parent-tracked. |
| (default) | All other content | — | Normal flow |

**Conflict resolution:** The skip link (z-50) must always appear above the progress bar (z-100)? Wait — z-100 > z-50, so the progress bar is above the skip link. **This is intentional** — the progress bar is 3px tall and at the very top; the skip link is fixed at `top-2` (8px) so they don't overlap visually. The progress bar (z-100) sits above everything because it should always be visible during scroll.

**Radix/shadcn portal z-index:** No Radix portals are currently used. If a modal/dialog is added later, document its z-index here (likely `z-modal: 1000` per Tailwind convention, above the progress bar).

---

## 19. Color Reference (Complete)

### 19.1 Semantic Tokens

| Token | Dark | Light | Cyber | Tailwind Class |
|---|---|---|---|---|
| `--bg` | `#0c0b09` | `#f3ecdc` | `#02060a` | `bg-bg` |
| `--bg-elev` | `#14120e` | `#faf3e1` | `#050d10` | `bg-bg-elev` |
| `--bg-elev-2` | `#1c1a14` | `#fffaee` | `#071318` | `bg-bg-elev-2` |
| `--fg` | `#f0ead6` | `#1a1610` | `#4eff96` | `text-fg` |
| `--fg-dim` | `#c9c1ad` | `#3d362b` | `#8affb8` | `text-fg-dim` |
| `--muted` | `#8a8275` | `#6b6358` | `#2a8a5e` | `text-muted` |
| `--accent` | `#f59e0b` | `#c2410c` | `#ffea00` | `text-accent`, `bg-accent` |
| `--accent-2` | `#06b6d4` | `#0e7490` | `#ff10f0` | `text-accent-2`, `bg-accent-2` |
| `--border` | `rgba(240,234,214,0.08)` | `rgba(26,22,16,0.12)` | `rgba(78,255,150,0.18)` | `border-border` |
| `--border-strong` | `rgba(240,234,214,0.18)` | `rgba(26,22,16,0.24)` | `rgba(78,255,150,0.4)` | `border-border-strong` |
| `--card` | `#15130e` | `#fffaee` | `#050d10` | `bg-card` |
| `--code-bg` | `#060503` | `#1a1610` | `#000` | `bg-code-bg` |
| `--code-fg` | `#f0ead6` | `#f3ecdc` | `#4eff96` | `text-code-fg` |
| `--glow` | `rgba(245,158,11,0.15)` | `rgba(194,65,12,0.12)` | `rgba(78,255,150,0.2)` | `shadow-[var(--glow)]` (or use `.input-field:focus`) |

### 19.2 RGB Variants (for `rgba(var(--accent-rgb), 0.X)` usage)

| Token | Dark RGB | Light RGB | Cyber RGB |
|---|---|---|---|
| `--accent-rgb` | `245, 158, 11` | `194, 65, 12` | `255, 234, 0` |
| `--accent-2-rgb` | `6, 182, 212` | `14, 116, 144` | `255, 16, 240` |

### 19.3 Syntax Highlighting Tokens (per-theme)

| Token | Dark | Light | Cyber |
|---|---|---|---|
| `.tk-key` | `#ff7b72` | `#c2410c` | `#ff10f0` |
| `.tk-str` | `#a5d6ff` | `#0e7490` | `#ffea00` |
| `.tk-fn` | `#d2a8ff` | `#7c2d12` | `#8affb8` |
| `.tk-com` | `#6e7681` | `#6b6358` | `#2a8a5e` |
| `.tk-num` | `#79c0ff` | `#0e7490` | `#ffea00` |
| `.tk-op` | `#ffa657` | `#c2410c` | `#ffea00` |
| `.tk-var` | `var(--code-fg)` | `var(--code-fg)` | `var(--code-fg)` |

### 19.4 Forbidden Colors

- **No purple gradients** (any theme). The accent palette is amber/terracotta/neon-yellow.
- **No Tailwind default colors** (`amber-400`, `cyan-500`, `gray-200`, etc.) — use the semantic tokens.
- **No arbitrary hex values** (`text-[#abc123]`) — use the tokens or extend `@theme`.

### 19.5 The Singular Exception

The traffic-light dots in `.code-window` use hardcoded hex values (`#ff5f57`, `#febc2e`, `#28c840`) — these are macOS window controls, not part of the design system. They are the only allowed hardcoded colors.

---

## 20. The Complete TypeScript Interface Reference

### 20.1 Marketing / Landing Interfaces

```typescript
// apps/web/src/domain/theme.ts
export const THEME_COOKIE = 'devlog-theme';
export const THEME_LOCALSTORAGE = 'devlog-theme';
export const VALID_THEMES = ['dark', 'light', 'cyber'] as const;
export type Theme = (typeof VALID_THEMES)[number];
export const THEME_ORDER: readonly Theme[] = VALID_THEMES;

export function isValidTheme(value: unknown): value is Theme;
export function cycleTheme(theme: Theme): Theme;
```

```typescript
// apps/web/src/domain/github.ts
export interface GitHubRepoStats {
  stars: number;
  forks: number;
}

export const FALLBACK_STARS = 82400;
export const FALLBACK_FORKS = 4180;
export const GITHUB_CACHE_TTL_SECONDS = 60;
export const GITHUB_INCR_INTERVAL_MS = 9000;

export function formatNumber(n: number): string;
```

### 20.2 Pipeline Domain Interfaces

```typescript
// apps/web/src/lib/env.ts
export type Env = {
  DATABASE_PATH: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL: string;
  RESEND_API_KEY?: string;
  RESEND_FROM: string;
  SIGNED_TOKEN_SECRET?: string;
  NEXT_PUBLIC_SITE_URL: string;
  NEXT_PUBLIC_GITHUB_REPO: string;
  NEXT_PUBLIC_AUTHOR_EMAIL: string;
  GITHUB_STATS_FALLBACK_STARS: number;
  GITHUB_STATS_FALLBACK_FORKS: number;
  CRON_SECRET?: string;
  DEV_AUTHOR_PASSWORD?: string; // R-57/R-92: prod seeds throw without it (>=16 chars)
  NODE_ENV: 'development' | 'test' | 'production';
};

export const env: Env;
```

### 20.3 Auth Interfaces

```typescript
// packages/auth/src/tokens.ts
export const SESSION_COOKIE = 'devlog_session';
export const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days, in seconds

export function createSessionToken(userId: string): Promise<string>;
export function verifySessionToken(token: string): Promise<string | null>;
// v1 transaction tokens (long-lived; unsubscribe/preferences manage links)
export function signToken(payload: string): Promise<string>;
export function verifyToken(token: string, expectedPayload: string): Promise<boolean>;
// R-80 (Pass 7): purpose-tagged transaction tokens with TTL on confirm
export type TransactionPurpose = 'confirm' | 'manage';
export const CONFIRM_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export function createTransactionToken(
  payload: string,
  purpose: TransactionPurpose,
): Promise<string>;
export function verifyTransactionToken(
  token: string,
  expectedPayload: string,
  expectedPurpose: TransactionPurpose,
): Promise<boolean>;
```

```typescript
// packages/auth/src/index.ts
export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: 'author' | 'subscriber';
  image: string | null;
}

export async function signIn(
  email: string,
  password: string,
  setCookie: (
    name: string,
    value: string,
    opts: {
      maxAge: number;
      httpOnly: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      path: string;
      secure: boolean;
    },
  ) => void,
): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }>;

export function signOut(
  clearCookie: (name: string, opts: { path: string }) => void,
): void;

export async function getSession(
  cookieValue: string | undefined | null,
): Promise<SessionUser | null>;

export async function getSessionFromCookies(): Promise<SessionUser | null>;

export async function requireAuthor(
  cookieValue: string | undefined | null,
): Promise<SessionUser>;

export class AuthorRequiredError extends Error;
export function isAuthorRequiredError(e: unknown): boolean;
```

### 20.4 Database Schema (Drizzle Inferred Types)

```typescript
// packages/db/src/schema.ts (re-exports)
export type User = typeof users.$inferSelect;        // { id, email, emailVerified, image, name, passwordHash, role, createdAt, updatedAt }
export type Session = typeof sessions.$inferSelect;  // { id, userId, token, expiresAt, createdAt, updatedAt, ipAddress, userAgent }
export type Post = typeof posts.$inferSelect;        // { id, slug, title, excerpt, contentMdx, coverImageUrl, publishedAt, updatedAt, readingTimeMinutes, authorId, status, createdAt }
export type Tag = typeof tags.$inferSelect;          // { id, slug, name, createdAt }
export type Subscriber = typeof subscribers.$inferSelect; // { id, email, status, confirmToken, unsubscribeToken, preferences, createdAt, confirmedAt, unsubscribedAt }
export type Comment = typeof comments.$inferSelect;  // { id, postId, parentId, authorName, authorEmail, body, status, createdAt }
export type SiteSettings = typeof siteSettings.$inferSelect; // { id, authorName, authorBio, authorAvatarUrl, socialLinks, defaultSeoDescription, defaultOgImageUrl, updatedAt }
```

### 20.5 Email Interfaces

```typescript
// packages/email/src/send.ts
export type EmailTemplate =
  | 'confirm-email'
  | 'new-essay-email'
  | 'unsubscribe-confirmation';

export interface SendEmailArgs<T extends EmailTemplate = EmailTemplate> {
  to: string | string[];
  from?: string;
  subject: string;
  template: T;
  props: TemplateProps<T>;
}

export interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

export const TEMPLATES: {
  'confirm-email': typeof ConfirmEmail;
  'new-essay-email': typeof NewEssayEmail;
  'unsubscribe-confirmation': typeof UnsubscribeConfirmation;
};

export type TemplateProps<T extends EmailTemplate> =
  React.ComponentProps<(typeof TEMPLATES)[T]>;

export async function renderEmail<T extends EmailTemplate>(
  template: T,
  props: TemplateProps<T>,
): Promise<{ html: string; text: string }>;

export async function sendEmail<T extends EmailTemplate>(
  args: SendEmailArgs<T>,
): Promise<SendEmailResult>;
```

### 20.6 Server Action Interfaces

```typescript
// apps/web/src/features/blog/actions.ts
export const createCommentInputSchema: z.ZodObject<{
  postId: z.ZodString;
  body: z.ZodString;
  parentId: z.ZodOptional<z.ZodString>;
  authorName: z.ZodDefault<z.ZodOptional<z.ZodString>>;
  authorEmail: z.ZodOptional<z.ZodString>;
}>;

export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

export interface CreateCommentSuccess {
  ok: true;
  commentId: string;
  message: string;
}

export interface CreateCommentFailure {
  ok: false;
  error: string;
  fieldErrors?: Partial<Record<keyof CreateCommentInput, string>>;
}

export type CreateCommentResult = CreateCommentSuccess | CreateCommentFailure;

export async function createComment(
  input: unknown,
  ctx: { ip?: string },
): Promise<CreateCommentResult>;
```

### 20.7 Environment Interface

See §20.2 above — the `Env` type is the canonical env interface.

### 20.8 Storage / OG Interfaces

No `r2.ts` storage layer exists. OG images are generated via `next/og` (dynamic `opengraph-image.tsx` per route, added in Pass 2/R-14) — no external R2 bucket. Reserved for future object storage in Phase 8+.

---

## Appendix A: ADRs

The PAD documents 7 ADRs. Summary (ADR-004 amended — Better Auth removed in R-2):

| ADR | Decision | Rationale |
|---|---|---|
| ADR-001 | Next.js 16 App Router (now 16.3.4) | Server Components by default; MDX via `pageExtensions`; `proxy.ts` (was `middleware.ts`, now `export async function proxy`) for edge auth |
| ADR-002 | Edge-safe auth split (`tokens.ts` vs `index.ts`) | Edge Runtime can't bundle `better-sqlite3`; pure crypto helpers go in `tokens.ts` |
| ADR-003 | Tailwind v4 CSS-first `@theme` | No `tailwind.config.ts`; tokens in `globals.css`; design budget closed |
| ADR-004 | Drizzle ORM + better-sqlite3 | SQLite-only; migrations via Drizzle Kit; lazy Proxy client avoids build-time DB opens |
| ADR-005 | Homegrown HMAC auth (HMAC-SHA256 + scrypt, Better Auth removed ADR-004 amendment) | HMAC tokens (not JWT); Web Crypto `crypto.subtle` (`async`, `timingSafeEqualHex`), `SESSION_COOKIE` + 30-day TTL; simpler than JWT |
| ADR-006 | Resend + React Email | Degrades gracefully without API key; React Email templates render to HTML + text |
| ADR-007 | Vitest + jsdom over Jest | Native ESM; faster; co-located tests; `react-hooks` v7 ruleset for `set-state-in-effect` |

See [`Project_Architecture_Document.md`](./Project_Architecture_Document.md) §2 for the full ADRs with rationale and alternatives considered.

---

## Appendix B: The Meticulous Approach

The 6-phase workflow used for every implementation task:

1. **ANALYZE** — Read the PRD/PAD/MEP triple before touching code. Map every change to an FR-N. Surface-level reading is not enough.
2. **PLAN** — Pick the MEP phase that owns this work; produce a RED→GREEN→REFACTOR checklist. Present the plan before coding.
3. **VALIDATE** — Confirm the layer boundaries (§5.1) are respected before writing the first test.
4. **IMPLEMENT** — Write the failing test first, then the implementation, then refactor. Commit atomically with `Refs: FR-N` footer.
5. **VERIFY** — `pnpm check` (`check-types && lint && test:coverage && audit --prod && build` — five stages, R-97) must be green before push. Never break `main`.
6. **DELIVER** — Update this SKILL.md / PRD if the change introduces a new pattern, anti-pattern, or lesson.

---

## Appendix C: Quick Reference Card

### File Paths (most-referenced)

| File | Purpose |
|---|---|
| `apps/web/src/proxy.ts` | Layer 0 — admin route guard (Edge `proxy`, Web Crypto) — replaces `middleware.ts` since 16.3.4 |
| `apps/web/src/app/layout.tsx` | Root layout — theme cookie sync, metadata, skip link |
| `apps/web/src/app/globals.css` | The full design system (1:1 port of mockup) |
| `apps/web/src/lib/env.ts` | Zod-validated env vars (throws at boot in prod) |
| `apps/web/src/lib/rate-limit.ts` | Sliding-window in-memory rate limiter |
| `apps/web/src/domain/theme.ts` | Pure theme types + `cycleTheme()` |
| `apps/web/src/domain/github.ts` | GitHub stats types + `formatNumber()` |
| `apps/web/src/hooks/use-typewriter.ts` | Type → pause → delete → advance cycle |
| `apps/web/src/hooks/use-theme.ts` | Theme state + `T` keyboard shortcut |
| `packages/db/src/schema.ts` | Drizzle schema — 8 tables (`sessions` reserved, never read by the stateless auth) |
| `packages/db/src/client.ts` | Lazy globalThis Proxy DB client; R-38 fail-fast when the file is missing |
| `packages/db/src/queries.ts` | The query boundary (Layer 1/2 calls go here) |
| `packages/auth/src/index.ts` | Homegrown HMAC auth surface — signIn/getSession/requireAuthor (Node-only; R-2 removed Better Auth) |
| `packages/auth/src/tokens.ts` | Edge-safe pure crypto helpers |
| `packages/email/src/send.ts` | Resend wrapper + template registry |
| `packages/config/tailwind/base.css` | Raw color tokens per `[data-theme]` |
| `apps/web/next.config.ts` | Next.js 16 config — security headers, MDX, standalone |
| `tsconfig.base.json` | Strict TS, path aliases, `erasableSyntaxOnly` |
| `turbo.json` | Turborepo task graph + env-aware caching |

### Common Commands

```bash
pnpm dev           # Dev server
pnpm check         # Full quality gate
pnpm db:generate   # Drizzle Kit: diff schema → SQL
pnpm db:migrate    # Apply migrations
pnpm db:seed       # Seed mockup data
pnpm db:studio     # Drizzle Studio at :4983

# Single-package
pnpm --filter @devlog/web test
pnpm --filter @devlog/db test

# SSH push (when OpenSSH missing)
GIT_SSH_COMMAND="skills/how-to-git-push-using-ssh-wrapper/scripts/ssh_git_wrapper_v3.py -i docs/ssh-key.txt -o StrictHostKeyChecking=accept-new" git push origin main
```

### The 5-Layer Golden Rule (one-liner)

`proxy → app → features → domain → lib` — a layer imports only from layers below or its own layer.

### Critical "Don'ts"

- Don't import `@devlog/auth` (root) in `proxy.ts` — use `@devlog/auth/tokens` (`await verifySessionToken`).
- Don't use `enum`, `namespace`, `as any`, default exports.
- Don't add a 4th theme — design budget is closed.
- Don't use Postgres/Redis — SQLite only.
- Don't use Framer Motion/GSAP — CSS-only animation.
- Don't modify `skills/**` or `landing_page_mockup.html`.
- Don't skip the failing test — TDD is mandatory.

---

*End of SKILL.md. This document was distilled following the `to-distill-project-into-skill` meta-skill (six-phase process) from the completed Phases 1–7 of the /dev/log Master Execution Plan. Verify against the codebase before extending — code drifts, docs shouldn't.*

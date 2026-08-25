# `/dev/log` — Notes from a Programmer's Desk

> Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am.
> By Alex Rivera. New essay every other Tuesday.

A production-grade programmer blog built with Next.js 16, React 19, Tailwind CSS v4, Drizzle ORM, better-sqlite3, Better Auth, Resend, and Vitest. The dynamic landing page reproduces `landing_page_mockup.html` pixel-for-pixel across dark / light / cyber themes.

## Engineering Documents

- [`Project_Requirements_Document.md`](./Project_Requirements_Document.md) — PRD. The *what* and *why*. Defines 60+ functional requirements (FR-1 through FR-60) traced to mockup elements.
- [`Project_Architecture_Document.md`](./Project_Architecture_Document.md) — PAD. The *how*. 7 ADRs, the 5-layer golden rule, annotated directory tree, security architecture, testing strategy.
- [`Master_Execution_Plan.md`](./Master_Execution_Plan.md) — MEP. The *in what order*. 8 phases, each with a file manifest, a TDD RED→GREEN→REFACTOR checklist, and an acceptance gate.

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Package manager | pnpm | ≥9.15 |
| Monorepo | Turborepo | ≥2.4 |
| Web framework | Next.js | ≥16.0 (App Router) |
| UI runtime | React | ≥19.0 |
| Language | TypeScript | ≥5.9 (strict, erasableSyntaxOnly) |
| CSS | Tailwind CSS | v4 (CSS-first @theme) |
| ORM | drizzle-orm | ≥0.40 |
| Database | better-sqlite3 | ≥12 |
| Auth | better-auth | ≥1.6 |
| Email | Resend + React Email | ≥4 / ≥3 |
| Validation | Zod | ≥3.25 |
| Client state | Zustand | ≥5 |
| Linter | ESLint | 9 (flat config) |
| Test runner | Vitest + jsdom | ≥2.1 / ≥25 |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/nordeim/programmer-blog.git
cd programmer-blog

# 2. Install (Node 20+, pnpm 9.15+)
pnpm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local:
#   - Generate BETTER_AUTH_SECRET:   openssl rand -hex 32
#   - Generate SIGNED_TOKEN_SECRET:  openssl rand -hex 32
#   - Optionally set RESEND_API_KEY (dev works without it — subscribe flow degrades gracefully)

# 4. Database (first run only)
pnpm db:generate   # Generate SQL migrations from schema
pnpm db:migrate     # Apply migrations (creates apps/web/devlog.db)
pnpm db:seed        # Seed mockup data (3 posts, 6 archive items, 5 snippets, 1 author)

# 5. Run
pnpm dev           # Boots Next.js at http://localhost:3000

# 6. Verify
pnpm check-types   # 0 errors
pnpm lint          # 0 errors
pnpm test          # 0 failures, coverage ≥80%
pnpm build         # Next.js standalone build
```

## Repository Layout

```
programmer-blog/
├── apps/web/                  # The Next.js 16 app
│   ├── src/
│   │   ├── app/                # App Router routes + layouts
│   │   ├── features/           # Feature-sliced modules (landing, blog, admin, auth)
│   │   ├── domain/             # Pure types and logic (Zod, slugify, signed-token)
│   │   ├── lib/                # Infrastructure adapters (db, auth, email, github)
│   │   ├── components/         # shadcn + custom UI primitives
│   │   ├── hooks/              # Custom React hooks (useTypewriter, useTheme, etc.)
│   │   ├── stores/             # Zustand stores (theme, ui)
│   │   └── styles/             # globals.css
│   ├── content/                # MDX essays and snippets
│   ├── public/                 # Static assets
│   ├── proxy.ts                # Next.js 16 edge request handler (Phase 6)
│   ├── next.config.ts
│   └── vitest.config.ts
├── packages/
│   ├── db/                     # Drizzle schema + client + migrations
│   ├── auth/                   # Better Auth instance
│   ├── email/                  # React Email templates + Resend wrapper
│   ├── types/                  # Shared Zod schemas + TS types
│   └── config/                 # Shared ESLint, TS, Tailwind config bases
├── docs/                       # Operating instructions, prompts, SSH key
├── skills/                     # Reference skills (READ-ONLY — do not modify)
├── landing_page_mockup.html   # Source of truth for the landing page (DO NOT MODIFY)
├── Project_Requirements_Document.md
├── Project_Architecture_Document.md
├── Master_Execution_Plan.md
└── package.json                # Workspace manifest
```

## The Golden Rule

A layer may only import from layers *below* it (higher-numbered) or from its own layer. Violations are caught by dependency-cruiser (configured in Phase 1).

```
Layer 0: proxy    — Edge request handler. NO database access.
Layer 1: app      — App Router. Stays thin. NO direct database queries in route files.
Layer 2: features — Feature modules. Each owns its UI, queries, mutations, types.
Layer 3: domain   — Pure types and logic. NO IO. NO React. NO Drizzle.
Layer 4: lib      — Infrastructure adapters (db, auth, email, github, rate-limit).
```

## Commit Conventions

- Trunk-based. All commits to `main`. No PRs.
- Conventional Commits format: `<type>(<scope>): <subject>`.
- Footer: `Refs: FR-N` to tie commits to functional requirements in the PRD.
- Each phase of the MEP produces 3–6 atomic commits.

## License

Proprietary. © Alex Rivera. Built with care, not frameworks.

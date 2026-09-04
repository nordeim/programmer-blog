# docs/session_log_5.md — Pass 7 Tiered Review + Live E2E + TDD Remediation

**Date:** 2026-09-04
**Agent:** Claw Code (Meticulous Approach, Mode C)
**Baseline:** `main @ ed06005` → `3f81255` (23 atomic commits)
**Scope:** Mode C audit → findings → remediation plan §13 → R-72..R-94 TDD → doc sync → push via SSH wrapper
**Gates:** `pnpm check-types` 5/5 ✅ · `pnpm lint` 0/0 ✅ · `pnpm test` 459/459 (37 auth / 21 types / 5 email / 41 db / 355 web) ✅ · `pnpm build` 27 routes ✅ · standalone smoke ✅ · `pnpm audit --prod` offline-unverifiable (no deps changed, 0 at Pass 7)
**Live site:** `https://programmer-blog.jesspete.shop` (Cloudflare edge + standalone origin)

> **Raw transcript preserved** as `docs/session_log_5_raw.md` (132 lines, single-sentence worklog). This file is the structured, evidence-linked promotion of that transcript. Validated in `docs/session_log_5_review.md` (Option A full trace, §7 gate re-run).

---

## 1. Objective

Execute **Pass 7** as Mode C per `code-review-and-audit` deep mode: validate `AGENTS.md`/`CLAUDE.md`/`README.md`/`programmer-blog_SKILL.md` against the codebase → live E2E against the deployed site → tiered review + security audit → triage → remediation plan §13 → RED→GREEN→atomic-commits `R-72..R-94` → contract doc sync → push.

---

## 2. Phase 1 — Docs ↔ Codebase Validation (no code)

- Read `AGENTS.md`, `CLAUDE.md`, `README.md`, `programmer-blog_SKILL.md` (6k lines) — claims: pnpm-only, Turborepo, mockup truth, `pnpm check` gate, 5-layer + R-46, Edge `proxy.ts` → `@devlog/auth/tokens` async Web Crypto, `erasableSyntaxOnly`, SQLite-only, `'use server'` async-only, 13 env vars via `lib/env.ts`.
- Mechanical validation — schema 8 tables (`users`, `sessions`, `posts`, `tags`, `postsToTags`, `subscribers`, `comments`, `siteSettings`), seed `9/12/3/2/1`, route inventory (rewrite `/rss.xml` `/sitemap.xml` `/robots.txt` → `/api/*`, hourly `revalidate` R-49/R-52), auth internals, scan tests (`layer-boundary-scan`, `use-server-exports-scan`, `revalidate-contract`, `env-example-scan`, `session-cookie-scan`), postbuild `copy-standalone-assets.ts`.
- Static contract validation passed; one doc drift (`27 routes` in build table vs README `25`) noted for R-94.

## 3. Phase 2 — Live E2E (`programmer-blog.jesspete.shop`, `agent-browser`)

All Pass 3–6 fixes verified holding (landing 6 sections, `/archive` 9 essays with tags-in-use, post/ comment, snippets, feeds, admin login). Two new live-verified bugs:

| # | Route | Observed | Root cause |
|---|---|---|---|
| E1 | `GET /robots.txt` | `Sitemap: http://localhost:3000/sitemap.xml` (stale) while `GET /rss.xml` `/sitemap.xml` correct (`https://programmer-blog.jesspete.shop`) | `Cache-Control: max-age=86400` (24h) contradicts `revalidate=3600` (1h). Cloudflare edge `HIT age:34507` (~9.6h) pins stale pre-fix copy. Cache-bust `?cb=MISS` returns correct prod URL — origin healthy, edge stale. → **M-49 / R-75** |
| E2 | Subscribe form POST `subscribeToNewsletter` success | No visible error, but `git diff` shows form used `e.currentTarget.querySelector` **after** `await` — React 19 nulls `currentTarget` post-dispatch → `TypeError: Cannot read properties of null` on every successful subscribe (unit suite never exercised full async flow). | → **M-51 / R-77** |
| E3 | `AGENTS.md`/`CLAUDE.md` document Server Action returns `{status:'ok'\|'error'}` while code returns `{ok:true/false}` | Stale doc claim from Pass 6 doc sync I-11. | → **M-? / R-94** |

Tag filter re-tested (1 result for `compilers` with correct selector), search verified wildcard-safe (`instr()` R-66 holds), comment moderation, admin open-redirect guard, themes/mobile/404/snippets checked. E2E evidence captured with headers (`cf-cache-status HIT/MISS`, `age`, `content-type`) before moving to audit.

## 4. Phase 3 — Tiered Review + Security Audit (deep)

Orchestrated per `code-review-and-audit` skill (static → security → quality 12-category → tests → expert review). Automated scanners produced **3,762 mostly-heuristic findings** (e.g., `SCREAMING_SNAKE` test constants flagged `PascalCase`). Per skill's anti-inflation rule, triaged rather than inflated:

- **~97% noise:** read-only `skills/**` reference material (per `AGENTS.md` "Do not modify `skills/**`").
- **4 app-code findings** examined: `JSON-LD escaping` (R-44 present), theme `catch` no-flash, `parseInt` radix, test fixtures — all **false positives** dispositioned.
- Parallel expert reviews of auth/input surfaces (tokens, env, unsubscribe, archive search) returned with one Critical to verify immediately.

### Triaged Findings — Pass 7 Addendum (`CODE_REVIEW_AUDIT_REPORT.md` §13)

| ID | Severity | Location | Evidence | Confidence |
|---|---|---|---|---|
| **C-41** | Critical | `/.env.local.example` (tracked) | production-faithful `64-hex` secrets (`BETTER_AUTH_SECRET`, `SIGNED_TOKEN_SECRET`), filled `DEV_AUTHOR_PASSWORD`, `programmer-blog.jesspete.shop` host under `.example` | **High — verified via `git ls-files` + `cat`** |
| **H-40** | High | `apps/web/src/lib/env.ts` | `RESEND_API_KEY=` present-but-empty (`cp .env.example .env.local` quick start) → Zod `startsWith('re_')` fails on `''` → prod build throws; `DEV_AUTHOR_PASSWORD` same | **High — reproduced via `pnpm build` error** |
| **H-42** | High | `apps/web/src/app/(public)/unsubscribe/page.tsx` | GET render calls `db.update(... set status='unsubscribed')` — email-client prefetchers silently unsubscribe users | **High — grep `db.update` in render path** |
| M-49 | Medium | `app/api/robots.txt/route.ts` | `Cache-Control: max-age=86400` vs `revalidate 3600` | High — cache-bust A/B proven |
| M-50 | Medium | `apps/web/src/lib/request-ip.ts` | `xff.split(',')[0]` trusts client-set first entry; appending proxies (nginx `$proxy_add_x_forwarded_for`, Cloudflare) put client LAST | High |
| M-51 | Medium | `features/landing/subscribe-section.tsx` | `e.currentTarget` read after `await` → React 19 `null` | High |
| M-52 | Medium | `app/(public)/archive/page.tsx`, `[page]/page.tsx`, `snippets/page.tsx` | no `alternates.canonical` → inherits root `canonical:'/'` → listing pages duplicate homepage per crawler | High |
| M-53 | Medium | `features/landing/hero-mouse-glow.tsx` | listeners on `pointer-events:none` overlay → dead code in browsers (jsdom no hit-test) | High |
| M-54 | Medium | `packages/auth/src/tokens.ts` | transaction confirm tokens no TTL/purpose — long-lived valid; verify sites share one purpose | Medium |
| M-55 | Medium | `next.config.ts` CSP | missing `base-uri 'self'; object-src 'none'; form-action 'self'` — do not fall back to `default-src` | High |
| L-45..L-56 | Low/Info | various | unique `(post,tag)` index, `updatePost` invariants, CSV tab/CR, null `publishedAt` guard, scoped `getPostsByIds`, site-relative `rssUrl`, `re_test_` sandbox, typewriter visibility, Tailwind literals, seed strength floor, docstrings | Medium |

---

## 5. Phase 4 — Remediation Plan §13 (TDD, atomic)

Plan committed before code, per `verification-and-review-protocol` Iron Law. **Order:** P1 Critical → P2 High → P3 Medium → P4 Low/Quality → P5 doc sync. Each R: RED test → GREEN → atomic Conventional Commit `Refs: FR-N`.

| R | Finding | Files | Commit |
|---|---|---|---|
| R-72 | C-41 env template secrets | `.env.local.example`, `env-example-scan.test.ts` | `c9379df fix(security): placeholders` |
| R-73 | H-40 empty=unset | `apps/web/src/lib/env.ts` (`withEmptyVarsUnset`), `lib/env.test.ts` | `47bc534 fix(web): empty=unset` |
| R-76 | M-50 rightmost XFF | `lib/request-ip.ts`, `request-ip.test.ts` | `b650c1d fix(web): rightmost XFF` |
| R-75 | M-49 robots hourly | `app/api/robots.txt/route.ts:38`, `route.test.ts:28` | `dc8b803 fix(blog): hourly Cache-Control` |
| R-81 | M-55 CSP | `next.config.ts:12` | `7cf3928 fix(web): CSP` |
| R-80 | M-54 TTL'd transaction tokens | `packages/auth/src/tokens.ts:176-224` (`CONFIRM_TOKEN_TTL_SECONDS=7d`, `createTransactionToken`/`verifyTransactionToken` purpose-tagged), consumers (`subscribe/actions.ts`, `/api/confirm`, `/unsubscribe`, `/preferences`) | `15a5f83 feat(auth): purpose-tagged TTL'd tokens` |
| R-77 | M-51 `currentTarget` | `features/landing/subscribe-section.tsx:38` (`const form = e.currentTarget` before `await`), `subscribe-section.test.tsx:28` | `bd4cbeb fix(landing): capture form` |
| R-78 | M-52 canonicals | `archive/page.tsx:25`, `[page]/page.tsx:23`, `snippets/page.tsx:20` + 3 metadata tests | `f9a8f21 fix(blog): canonicals` |
| R-79 | M-53 mouse-glow parent track | `hero-mouse-glow.tsx:19` `useMouseGlow({track:'parent'})`, `hooks/use-mouse-glow.ts` `track` option, `pointerEvents:'none'` stays on wrapper | `5f4322b fix(landing): hero glow parent` |
| R-74 | H-42 POST-only unsubscribe | `features/subscribe/actions.ts:190` `confirmUnsubscribe`, `unsubscribe-form.tsx` client POST, `app/(public)/unsubscribe/page.tsx` render-only + idempotent | `41bed6e fix(subscribe): POST unsubscribe` |
| R-82..R-94 | L-45..L-56 + doc sync | `schema.ts:118` uniqueIndex, `admin/actions.ts` `Set(tagSlugs)` dedupe, `queries.ts` clamps, `csv.ts` tab/CR, `settings-form` `new URL(input, base)`, `packages/email/send.ts` sandbox skip, `use-typewriter.ts` visibility, Tailwind literals, seed `≥16`, docstrings, `AGENTS.md`/`CLAUDE.md`/`README.md`/`SKILL.md` R-94 | `550bf8d`..`3f81255` (12 commits) |

Discipline notes captured in raw log (each self-corrected in §13 plan): `R-79` premature commit before diagnosis, `R-82` mock call-counting, `R-80` fake-timer fix — all resolved forward without squashing history per trunk-based rule.

---

## 6. Phase 5 — Verification Ledger

| Gate | Command | Result |
|---|---|---|
| check-types | `pnpm check-types` | ✅ 5/5 green |
| lint | `pnpm lint` | ✅ 0/0 |
| test | `pnpm test` | ✅ 459/459 (37 auth / 21 types / 5 email / 41 db / 355 web) |
| build | `pnpm build` | ✅ 27 routes, `postbuild` `static=true public=true` |
| standalone smoke | `node apps/web/.next/standalone/apps/web/server.js` + `curl` | ✅ `/` 200, `/archive` 9 essays, `/posts/[slug]` single `<h1>` + `canonical https://…`, `/rss.xml` 9 `<item>`, `/sitemap.xml` 17 `<loc>`, `/robots.txt` `Sitemap: https://…` + `Cache-Control: public, max-age=3600, s-maxage=3600`, `/admin` 307, CSP `base-uri/object-src/form-action` present |
| audit | `pnpm audit --prod` | ⏭ offline in sandbox (registry unreachable); **0 vulns at Pass 7 via `pnpm-workspace.yaml` overrides**, no deps changed |
| push | `GIT_SSH_COMMAND="…/ssh_git_wrapper_v3.py -i docs/ssh-key.txt -o StrictHostKeyChecking=accept-new" git push` | ✅ `ed06005..3f81255 main → main`, tracking ref synced |

**23 atomic commits** `ed06005..3f81255` on `main`, Conventional Commits with `Refs: FR-N`. One accidental scratch `.audit-report.md` removed in `1649c43` (noted).

## 7. Operator Actions Required

1. **Rotate `BETTER_AUTH_SECRET`, `SIGNED_TOKEN_SECRET`, `DEV_AUTHOR_PASSWORD` on the deployment** — C-41 exposed production-faithful values in tracked history until `c9379df`. Purge history or rotate and document.
2. **Purge Cloudflare cache for `/robots.txt` after deploying** `dc8b803` — otherwise the `86400` edge pin persists for ~24h.
3. Backlog (tracked in `REMEDIATION_PLAN.md` §13): nonce-based CSP, session revocation, deploy-key rotation, `turbo.json` `globalEnv` hardening.

## 8. Lessons Added (R-94, 6 new L-entries)

- L-26 Present-but-empty env vars are not absent (empty=unset).
- L-27 `pointer-events:none` element can never be an event target.
- L-28 Destructive writes must not ride on GET.
- L-29 Canonical metadata inherits through layouts.
- L-30 First `X-Forwarded-For` entry is the attacker's (take rightmost).
- L-31 React 19 nulls `event.currentTarget` after dispatch (capture before `await`).

---

*Validated via `docs/session_log_5_review.md` (Option A §7 gate re-run). Pass 7 `COMPLETE`.*

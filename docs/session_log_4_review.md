# docs/session_log_4.md — Formal Validation Review

**Review date:** 2026-09-05
**Reviewer:** Claw Code (Frontend Architect — verification pass)
**Baseline:** `main @ cd7896d` (post-Pass 6), `pnpm 9.15.4`, `Node ≥20`
**Subject:** `docs/session_log_4.md` (109 lines, terse Pass 6 worklog: contract-doc alignment → `pnpm check-types/lint/test` 360→405 → DB/E2E drift → tiered audit `R-57..R-71` TDD → doc-sync → 13 commits → `cd7896d` via SSH wrapper)
**Gate executed:** `pnpm check-types` 4/5 green (1 failure — see §8 G-5), `pnpm lint` 5/5 green, `vitest` 405/405 green (322 web + 33 db + 26 auth + 21 types + 3 email), scan contracts 7/7 green where re-run (see §7).

> **One-line verdict:** **Largely accurate; one regression missed.** The log's Pass 6 narrative — 360→405 tests, 8 tables / 13 env vars / route inventory, tiered audit findings, and the full `R-57..R-71` TDD sequence through 13 atomic commits — is traceable to real defects, real fixes at `file:line`, and passing regression pins. The remaining gap is a **new type regression introduced by R-63's test** (`mdx-components.test.tsx:75`) that the log's `pnpm check-types: 0 errors` claim (and its final `pnpm check` green) does not reflect; it blocks `pnpm check` on `main` today. One additional soft drift (`turbo.json globalEnv` missing `DEV_AUTHOR_PASSWORD`) is informational.

---

## 1. Scope & Methodology

This review validates **the log as a source of truth for Pass 6**, not the live deployment at a point in time (no production URL was re-hit in this turn; live re-E2E is out of scope and tracked as §8 G-2).

1. **Inventory** the four contract docs (`AGENTS.md`, `CLAUDE.md`, `README.md`, `programmer-blog_SKILL.md`) and the three spec/plan artifacts (`CODE_REVIEW_AUDIT_REPORT.md`, `REMEDIATION_PLAN.md`, `MEP`).
2. **Parse** `session_log_4.md` into atomic claims (one row = one falsifiable assert) and separate self-corrected claims.
3. **Collect local evidence** per claim: source location (`file:line`), regression test name, and `vitest`/`tsc`/`eslint` result. No code was changed to make a claim pass except the read-only review artifact itself.
4. **Cross-check** systemic claims (session cookie constant, `SIGNED_TOKEN_SECRET` wiring, search `instr()` vs `LIKE`, layer boundaries, prod secret boot throw) against the architecture and the committed audit addenda.
5. **Record** gaps/risks that are not defects in the log but require a tracked follow-up.

All file paths below are repo-relative. Line numbers sampled at `cd7896d`; small offsets (±3) may occur after formatting.

---

## 2. Inventory — what the four contract docs claim (and that the code matches)

| Contract doc | Key claims checked | Code spot-checked | Result |
|---|---|---|---|
| `AGENTS.md` | pnpm-only, Turborepo, mockup truth, `pnpm check` gate, 5-layer + R-46 precision, Edge `proxy.ts` → `@devlog/auth/tokens` only, `erasableSyntaxOnly`, SQLite-only, CSS-only animation, `'use server'` async-only, 13 env vars via `lib/env.ts` | `pnpm-workspace.yaml`, `tsconfig.base.json`, `turbo.json`, `landing_page_mockup.html` vs `globals.css`/`base.css`, `proxy.ts:13`, `use-server-exports-scan.test.ts`, `layer-boundary-scan.test.ts`, `server-action-ip-scan.test.ts` | ✅ Aligned (one `globalEnv` soft drift — §8 G-6) |
| `CLAUDE.md` (revalidated 2026-09-04) | Six-phase Meticulous Approach, Next 16 quirks (`proxy.ts`, `standalone` + `postbuild`, hourly `revalidate`), fail-fast DB, dialect guardrails, HMAC v2 + `SIGNED_TOKEN_SECRET` separation | `next.config.ts` (standalone/rewrites/security headers), `scripts/copy-standalone-assets.ts`, `revalidate-contract.test.ts`, `queries.ts` (`count()` + `postEpochSeconds`) | ✅ Aligned |
| `README.md` | 405-test badge, tech-stack table, route table (15 public + 9 admin incl. rewrites), 13 env vars via `lib/env.ts`, standalone deploy checklist (5 steps + `R-38` fail-fast + `R-49/R-52` hourly), troubleshooting 12 entries incl. `use-server-exports-scan` | `pnpm test` 322+33+26+21+3, `lib/env.ts:EnvSchema`, `proxy.ts`, `app/api/*`, `lib/mdx.tsx` | ✅ Aligned |
| `programmer-blog_SKILL.md` | 20 sections + ADRs, `@theme` block, 8 keyframes, 20 component classes, 8 hooks, 14 anti-patterns incl. AP-14, 5-layer + R-46, staged coverage | `globals.css:21-46` @theme, `hooks/use-*`, `queries.test.ts`, `use-server-exports-scan.test.ts`, `layer-boundary-scan.test.ts` | ✅ Aligned (content `360→405` front-matter now correct at `cd7896d`) |

Docs↔code alignment is **confirmed** for all normative claims; see §7 for the gate table. The only hard divergence is the new `check-types` failure (§4 L-109 / §8 G-5).

---

## 3. Log Structure — how to read `session_log_4.md`

The log is a **terse chronological worklog** (109 lines, one sentence per step, no timestamps, no `file:line` citations, English with one Chinese sentence at line 22). It compresses an entire Pass 6 tiered audit + TDD remediation into a single stream:

- **Lines 1-7:** Modes A–D internalization → repo clone → parallel read of four docs → key claim set (`360 tests, 5 packages, routes, env vars, layer rules, auth`).
- **Lines 4-7:** Validation gates (type-check → lint → 360 tests) + DB creation (`8 tables, 9 posts/12 tags` vs docs `3/6/5`) + content-source drift (`content/posts/*.mdx` does not exist → DB-backed MDX).
- **Lines 8-18:** Live E2E sweep via `agent-browser` (landing 6 sections → `/archive` 9 essays → post/comment → feeds 9 RSS / 17 sitemap → `CSP` → audit dispatch).
- **Lines 19-27:** Automated audit de-noising per `code-review-and-audit` skill (`lockfiles/skills/**` noise) + targeted deep review → `0 prod vulnerabilities` + secret scan + `dangerouslySetInnerHTML` escape check → consolidated findings.
- **Lines 28-82:** Pass 6 audit addendum + remediation plan §12 TDD sequencing, then **sequential RED→GREEN→REFACTOR** for `R-57..R-66` (+ `R-68/R-69`) with intermediate `pnpm test` greens, doc-sync (`AGENTS.md` 5 edits + `CLAUDE.md` + `README.md` + `SKILL.md`), and the env-less build failure (line 77 — correctly diagnoses `R-61` requiring `BETTER_AUTH_SECRET`/`SIGNED_TOKEN_SECRET` in prod builds, fixed by creating `.env.local` per Quick Start).
- **Lines 82-91:** Coverage gate (`0.96%` short → `mdx-components.test.tsx` central after `R-63` → `405 tests` + `322 web`) + `13 atomic Conventional Commits` (`a24109e`..`cd7896d`) + `C-40` discovery (`force-added .env.local` with real secrets) → untrack + remediation documentation.
- **Lines 88-105+:** Push via SSH wrapper (HTTPS→SSH URL form, `origin/main @ cd7896d`) + final summary + three operator actions (`rotate BETTER_AUTH_SECRET/SIGNED_TOKEN_SECRET/DEV_AUTHOR_PASSWORD`, redeploy with prod env, SSH key scoping).

No claim in the log is explicitly retracted inside the log itself (unlike `session_log_3.md` B8/B9). The log's summary at lines 94-105 restates the validation / audit / remediation / docs narrative without introducing new factual claims.

---

## 4. Claim-by-Claim Validation — atomic asserts

### 4.1 Phase 1–2: Doc read + local gate (lines 1-7)

| Line | Log claim (gist) | Verdict | Evidence on disk |
|---|---|---|---|
| **1** | Internalized operating instructions (modes A–D, decision hierarchy, audit discipline, TDD) | ✅ Narrative — not falsifiable; consistent with `AGENTS.md`/`CLAUDE.md` invocation of the Meticulous Approach | — |
| **2** | Repo cloned; four docs read in parallel | ✅ | `AGENTS.md`, `CLAUDE.md`, `README.md`, `programmer-blog_SKILL.md` all present at repo root |
| **3** | Key claim set to validate: `360 tests, 5 packages, route inventory, env vars, layer rules, auth` | ✅ | Mirrors `README.md` badge `360` (pre-Pass 6 baseline) / `packages/*` 5 dirs / `apps/web/src/proxy.ts` + `app/api/*` / 13 vars in `lib/env.ts` / 5-layer in `AGENTS.md` |
| **4** | Dependencies installed; validation gates `type-check, lint, 360 tests` — `360 tests` pass as `287 web / 27 db / 22 auth / 21 types / 3 email`, `type-check` + `lint` clean across 5 packages | ⚠️ **Partially confirmed** — test split is the pre-Pass 6 baseline (at `e82f507`); at `cd7896d` the split is `322 web / 33 db / 26 auth / 21 types / 3 email = 405`. The contemporary run in this review (§7) shows `pnpm test` **405 green** (see line 82), but `pnpm check-types` is now **red** (see §4 L-82/G-5). The log's snapshot was true at the time it was written; today `check-types` is no longer clean. |
| **5** | Type-check + lint clean within that run | ⚠️ Same as line 4 — true at the time, now superseded by the `mdx-components` regression (§8 G-5) | `pnpm check-types` at `cd7896d` fails (2 errors, `mdx-components.test.tsx:75`); `pnpm lint` remains 0/0 |
| **6** | DB created with `8 tables` as documented, but `9 posts / 12 tags` — docs claim `3 posts, 6 archive, 5 snippets, 1 author` may be stale | ✅ **Fixed in Pass 6** | `packages/db/src/schema.ts` 8 tables; `packages/db/src/seed.ts:9` "Inserts 9 posts … 12 tags" + `seed.test.ts`; `AGENTS.md`/`README.md`/`CLAUDE.md`/`SKILL.md` now say `9 posts, 12 tags` (R-70 doc-sync at `2359c95`) — the drift the log flags is closed |
| **7** | Posts rendered from DB via MDX — not `content/posts/*.mdx` (which don't exist) — doc misalignment #1 | ✅ | `apps/web/content/` contains only `snippets/` (5 MDX files); `packages/db/src/seed.ts` + `features/blog/post-page.tsx → lib/mdx.tsx::renderMDX` confirm DB-backed posts; Pass 6 doc-sync corrected the narrative (CLAUDE §MDX content, README route table) |

### 4.2 E2E sweep (lines 8-17)

| Line | Log claim | Verdict | Evidence |
|---|---|---|---|
| **8-9** | `agent-browser` skill loaded; live site up; landing page `hero typewriter` + `6 sections` present | ✅ | `skills/agent-browser/SKILL.md` exists; `features/landing/` has `hero.tsx`, `marquee.tsx`, `recent-notes.tsx`, `snippet-showcase.tsx`, `archive-preview.tsx`, `subscribe-section.tsx` + `hero-typewriter.tsx`; `app/(public)/page.tsx` renders all six |
| **10** | `/archive` `9 essays`, `tags-in-use filter (9 used of 12)` | ✅ | `queries.ts:168` `getTagsInUse()` = `selectDistinct tags ⨝ postsToTags ⨝ posts where status='published'`; `app/(public)/archive/page.tsx:43` consumes it; `queries.test.ts:133-153` pins `9 used of 12` |
| **11** | Post page + comment form `200` pending moderation | ✅ | `features/blog/actions.ts` (`createComment` → status `pending` + `rateLimit` via `getClientIpFromHeaders`) + `blog/actions.test.ts` green; `app/(public)/posts/[slug]/page.tsx` `revalidate=3600` |
| **12-13** | Feeds `9 RSS items, 17 sitemap locs`; snippet has **`two <h1>`** — possible `R-54` regression | ✅ | `lib/blog.ts:54` `stripLeadingH1` (R-54 fix for post pages) does **not** apply to snippet MDX rendering — snippet page retains `page-header <h1>` + MDX `#` body heading. The log correctly identifies the snippet gap that becomes `R-64` (single-h1 pin on snippets) |
| **14** | Failed login shows no visible error — silent UX failure; re-checked and retracted as false alarm (`login-error` renders) | ✅ | `features/auth/login-form.tsx` renders `data-testid="login-error"` `role="alert"`; line 14-15 self-correction is accurate — no defect |
| **15-17** | Subscribe `toast` feedback works; theme toggle + mobile + preferences all functional; search filter works; `CSP` header verified | ✅ | `features/subscribe/actions.test.ts` pins toast path; `features/landing/theme-toggle.tsx` + `stores/theme-store.ts`; `app/(public)/posts/[slug]/page.tsx` + `next.config.ts:securityHeaders()` with `default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src https://api.github.com https://api.resend.com`; all consistent |

### 4.3 Tiered audit (lines 18-27)

| Line | Log claim | Verdict | Evidence |
|---|---|---|---|
| **18-20** | `code-review-and-audit` deep mode; automated runner noise from `lockfiles/generated` + `skills/**` scoped out per skill fallback protocol; only real hit `packages/db/src/seed.ts` | ✅ | `skills/code-review-and-audit` + `skills/how-to-git-push-using-ssh-wrapper` present; `skills/**` is read-only reference (AGENTS "Don't Do This"); de-noising methodology matches the skill's anti-inflation rule |
| **21** | `0 prod vulnerabilities` matches README | ✅ (at push time) | `pnpm-workspace.yaml:overrides` (`qs, prismjs, glob, esbuild, @babel/core`) + `package.json#pnpm.overrides` duplicate; `pnpm audit --prod` in this review timed out to registry (§2.1) — local cache at `cd7896d` was 0; re-verify on next `pnpm check` with network |
| **22** | 静态扫描无异常; `2` `dangerouslySetInnerHTML` sites need escape verification; two parallel deep-review agents dispatched | ✅ | `rg dangerouslySetInnerHTML apps/web/src` → `app/layout.tsx:84` (theme-sync script, intentional) + `components/json-ld.tsx` (`JSON.stringify` + `__html`); both correctly flagged for escape validation (SKILL §10.5 / §19) |
| **23-27** | Both deep reviews in; `CODE_REVIEW_AUDIT_REPORT.md` + `REMEDIATION_PLAN.md` structure examined for Pass 6 addendum + §12 TDD sequencing; all fix targets validated against actual code | ✅ | `CODE_REVIEW_AUDIT_REPORT.md` Pass 6 addendum (C-38..C-40, H-39, M-41..M-48, L-41..L-44) + `REMEDIATION_PLAN.md` §12 `R-57..R-71` at `cd7896d`; line 28 commits confirm the plan was written before execution |

### 4.4 TDD remediation `R-57..R-71` (lines 28-91 — the core of the log)

| Log line | Remediation | Log claim | Verdict | Primary evidence (`file:line` + pinning test) |
|---|---|---|---|---|
| **28-32** | **R-57 C-38** prod seed guard | Extract `resolveAuthorPassword()` pure function for testability; RED 4 failures → GREEN; `start_server.sh` + `.env.example` | ✅ | `packages/db/src/seed.ts:47` `resolveAuthorPassword(env)` (`DEV_AUTHOR_PASSWORD` wins; prod without it throws; default re-set in prod throws) + `seed.test.ts:resolveAuthorPassword` 4 cases — **green**; `start_server.sh` generates `openssl rand -hex 32` for `DEV_AUTHOR_PASSWORD`; `.env.example` documents `R-57/C-38` |
| **32-36** | **R-58 H-39** server-action `ctx.ip` spoofable | Scan test RED → remove `ctx` from `blog/actions.ts` + `subscribe/actions.ts`; IP from `getClientIpFromHeaders(await headers())` only | ✅ | `apps/web/src/lib/request-ip.ts:22` `getClientIpFromHeaders(headers)` (x-forwarded-for first entry → x-real-ip); `server-action-ip-scan.test.ts:22-48` forbids `ctx.ip`/`{ ip:` in the 4 action files — **green**; `features/blog/actions.ts:34` + `features/subscribe/actions.ts:42` both call `getClientIpFromHeaders(await headers())` |
| **36-38** | **R-59 M-43** unbounded rate-limit store | RED → bounded eviction (idle sweep 2× window + hard cap `10_000` buckets oldest-first) | ✅ | `apps/web/src/lib/rate-limit.ts:1-65` (`DEFAULT_MAX_BUCKETS=10_000`, idle sweep `now - newest >= windowMs*2`, hard cap `Map` insertion-order eviction) + `rate-limit.test.ts` eviction cases — **green** |
| **38-43** | **R-60 M-44** open redirect `?next=` | Check existing `safeNext`; RED new helper → GREEN `safeNext(next)`; wired into both action + login page | ✅ | `apps/web/src/features/auth/next-url.ts:17` `safeNext` (rejects `^[a-z][a-z0-9+.-]*:`, `//`, `\\`, `\`, `..`, control chars; only `/admin*` allowed; fallback `/admin`) + `next-url.test.ts:14-36` — **green**; `features/auth/actions.ts:78` `safeNext(next)` + `app/(auth)/admin/login/page.tsx:43` `safeNext(sp.next)` |
| **43-47** | **R-61 M-45** missing prod secrets boot throw | Env boot throw; `R-41` tests must now provide secrets; dev warns when absent | ✅ | `apps/web/src/lib/env.ts:55-78` `loadEnv()` checks `SECURITY_CRITICAL_KEYS` (`BETTER_AUTH_SECRET`, `SIGNED_TOKEN_SECRET`) → prod throw `Missing required… 32+ char`, dev `console.warn`; `lib/env.test.ts` production-missing + dev-warn cases — **green**; `lib/env.test.ts` R-41 tests supply `BETTER_AUTH_SECRET`/`SIGNED_TOKEN_SECRET` |
| **47-50** | **R-62 M-46** `SIGNED_TOKEN_SECRET` wiring | Transaction tokens keyed by `SIGNED_TOKEN_SECRET` (dev falls back to session secret) | ✅ | `packages/auth/src/tokens.ts:60-72` `getTransactionSecret()` (≥32 → itself; prod without → throw; dev → `getSecret()`); `hmacHex(payload, getTransactionSecret())` at `tokens.ts:143/154`; `token-keys.test.ts` rotation separation — **green** |
| **50-58** | **R-63 M-47** 5-layer restoration + MDX dependency inversion | Layer-boundary scan RED 4 violations → `domain/archive.ts` + `renderMDX(components)` required param + `MdxComponentMap` via `MDXRemote` prop type; `public API` exception refined (`actions.ts`/`schemas.ts`) | ✅ | `apps/web/src/domain/archive.ts:1-40` (`ArchiveItemData` + `MOCKUP_ARCHIVE`) pure types — no React/IO; `apps/web/src/lib/mdx.tsx` now `renderMDX(mdx, components: MdxComponentMap)` required; `layer-boundary-scan.test.ts:38-85` (lib→features + features→features internals, public-API exception at `/(actions|schemas)$/`) — **green**; `features/blog/mdx-components.tsx` (`defaultMDXComponents`) now consumed via injection, not `lib/mdx.tsx` direct import |
| **58-60** | **R-64 M-48** snippet single-`<h1>` | RED evidence `2× <h1>` live curl → GREEN `stripLeadingH1` on snippets + page-header single `<h1>` | ✅ | `apps/web/src/app/(public)/snippets/[slug]/page.tsx:52` `stripLeadingH1(mdx)` before `renderMDX`; `lib/blog.ts:54` `stripLeadingH1` (`/^#[^\S\n].*\n?/` first-line only) + `lib/blog.test.ts:74` 6 cases — **green**; snippet `page.test.tsx` single-h1 pin — **green** |
| **60-61** | **R-65 L-40** URL scheme guard (`javascript:`/`data:`) | RED 6 failures → GREEN `http(s)`-only | ✅ | `apps/web/src/features/admin/schemas.ts:siteSettingsSchema` + `lib/env.ts` URL validation; `siteSettingsInputSchema` scheme guard `z.string().url().refine(url => url.startsWith('https://') \|\| url.startsWith('http://'))` + `admin/schemas.test.ts` 6 scheme cases — **green** |
| **61-69** | **R-66 L-41** wildcard-safe search (`%`/`_` wildcards) | First `%`-escape approach wrong (needs `ESCAPE` clause) → correct fix: `instr()` literal substring + `LIMIT 50`; extended to live `?q=` path `getArchivePosts`/`getArchiveCount` | ✅ | `packages/db/src/queries.ts:369-391` `buildSearchCondition(query)` via `sql`instr(lower(title), lower(needle)) > 0`` (no `like`, no `ESCAPE`); `SEARCH_LIMIT=50`; `queries.test.ts:searchPosts` (`'%'` returns 0 rows, `'_'` literal, `LIMIT`) — **green**; `getArchivePosts:65` + `getArchiveCount:107` both use `buildSearchCondition` |
| **69-70** | **R-68** eslint ref + **R-69** pagination comment | Docs-level fixes | ✅ | `apps/web/src/lib/pagination.test.ts` + `eslint.config.mjs` anonymous-default-export naming (M-7 already fixed in Pass 2; R-68 closes the residual); `lib/pagination.ts:1-12` `paginate()` `maxVisible` comment at `R-69/L-44` |
| **70-76** | **`R-70` docs sync** — `AGENTS.md` 5 edits + `Don't Do This`, `CLAUDE.md`, `README.md`, `SKILL.md` | ✅ | `git show cd7896d --stat` equivalent at `2359c95` (docs: Pass 6 audit + remediation sync); `AGENTS.md` 13 vars + layer table + `Don't Do This` entry for `ctx.ip`/`LIKE`/`dev password`; `CLAUDE.md` `revalidated 2026-09-04` + `R-57..R-70` callouts; `README.md` `405 tests`, `9 posts/12 tags`, `R-38` fail-fast, `SIGNED_TOKEN_SECRET`; `SKILL.md` `405 (322/33/26/21/3)`, `Next 16.3.4`, `proxy.ts` Web Crypto |
| **76-79** | **`pnpm check` green** — but build fails without prod secrets (correct `R-61` enforcement); fixed by creating `.env.local` per Quick Start | ✅ | `apps/web/src/lib/env.ts:60` throw in `NODE_ENV=production` without `BETTER_AUTH_SECRET`/`SIGNED_TOKEN_SECRET` (32+); `.env.example` + `README.md` Quick Start step 3 (`openssl rand -hex 32` ×2); `.env.local` at `cd7896d` was **untracked** after `R-71` — CREATE is the correct remedy (see also G-5 below for the subsequent `check-types` failure which is a distinct regression) |
| **80-84** | Coverage gate `0.96%` short → `mdx-components.test.tsx` central after `R-63` → `405 tests (322 web)` | ✅ | `vitest.config.ts` staged thresholds `64/68/90/64` (R-30); `features/blog/mdx-components.test.tsx:1-100` (PreBlock language hint, `MdxLink` internal/external, `MdxImage` local/remote/null) lifts `functions` to green; `pnpm test` at `cd7896d` is `67 web files / 322 web tests` (+ 83 in other packages) |
| **84-88** | **C-40** discovery — `force-added .env.local` with real secrets in a public repo → untracked in `R-71` + audit documentation | ✅ | `git log --oneline` at `cd7896d` shows `a24109e chore(security): untrack force-added .env.local with real secrets (R-71, C-40)`; `git ls-files | grep env.local` empty at `cd7896d`; `.gitignore:18` `.env.local`; `CODE_REVIEW_AUDIT_REPORT.md` Pass 6 Addendum `C-40` documents mandatory rotation of `BETTER_AUTH_SECRET`/`SIGNED_TOKEN_SECRET`/`DEV_AUTHOR_PASSWORD` |
| **88-91** | **Push via SSH wrapper** — HTTPS remote → SSH URL form, `GIT_SSH_COMMAND="skills/.../ssh_git_wrapper_v3.py -i docs/ssh-key.txt -o StrictHostKeyChecking=accept-new" git push` → `origin/main @ cd7896d` | ✅ | `skills/how-to-git-push-using-ssh-wrapper/SKILL.md` + `docs/ssh-key.txt` (committed, risk-accepted with rotation follow-up per Pass 6); `git remote -v` at review time is `https://github.com/nordeim/programmer-blog` — the wrapper is the documented transport for this sandbox (AGENTS.md SSH Push); log's "wrapper needs SSH URL form" note at line 89-90 matches the skill's `GIT_SSH_COMMAND` pattern |
| **92-109** | Summary + three operator actions | **Mostly accurate** — with one update: the summary's `pnpm check green` claim is now stale (see §8 G-5) | Validation `9 posts/12 tags`, `skills/**` noise de-noising, `snippet 2× <h1>`, `R-57..R-71` 405 tests, and `C-40` discovery all hold; operator actions (1) rotate three secrets, (2) redeploy with prod env, (3) SSH deploy-key scoping remain open |

---

## 5. Remediation Tasks `R-57..R-71` (REMEDIATION_PLAN §12 + git evidence)

| ID | Plan text | Verdict | Primary evidence (commit + file) |
|---|---|---|---|
| **R-57 C-38** | Prod seed guard — `resolveAuthorPassword()` pure + `start_server.sh` strong random | ✅ | `edbc770 fix(db): refuse production seeds without DEV_AUTHOR_PASSWORD` — `seed.ts:47`, `seed.test.ts` 4 cases |
| **R-58 H-39** | Derive rate-limit IP from `getClientIpFromHeaders(await headers())` only | ✅ | `0857f64 fix(web): derive rate-limit IP from headers only` — `lib/request-ip.ts:22`, `server-action-ip-scan.test.ts` |
| **R-59 M-43** | Bound `rate-limit` store (`10_000` buckets, idle sweep) | ✅ | `0a65907 fix(web): bound the rate-limit store` — `lib/rate-limit.ts:20-60` |
| **R-60 M-44** | Sanitize `?next=` via `safeNext` on login page + action | ✅ | `8c06015 fix(web): sanitize ?next=` — `features/auth/next-url.ts:17`, `next-url.test.ts` |
| **R-61 M-45** | Throw at boot for missing prod secrets (`BETTER_AUTH_SECRET`, `SIGNED_TOKEN_SECRET`) | ✅ | `d2a26cb fix(web): throw at boot for missing production secrets` — `lib/env.ts:55-78` |
| **R-62 M-46** | Key transaction tokens with `SIGNED_TOKEN_SECRET` | ✅ | `1217d3b feat(auth): key transaction tokens with SIGNED_TOKEN_SECRET` — `auth/tokens.ts:60-154`, `token-keys.test.ts` |
| **R-63 M-47** | Restore 5-layer boundaries + inject MDX components (`domain/archive.ts`) | ✅ + follow-up | `0b39d63 refactor(web): restore 5-layer boundaries` — `domain/archive.ts`, `lib/mdx.tsx` (`renderMDX(components)`), `layer-boundary-scan.test.ts` |
| **R-63 follow-up** | Drop relocated `features/landing/archive-item.tsx` | ✅ | `cd7896d chore(web): drop relocated archive-item.tsx` |
| **R-64 M-48** | Pin single-`<h1>` on snippet pages (`stripLeadingH1`) | ✅ | `7aff2c8 test(web): pin single-h1 on snippets` — `snippets/[slug]/page.tsx:52`, `lib/blog.ts:54` |
| **R-65 L-40** | Require `http(s)` schemes for site-settings URLs | ✅ | `f0b1616 fix(web): require http(s) schemes` — `features/admin/schemas.ts` |
| **R-66 L-41** | Wildcard-safe search + bounded `LIMIT 50` via `instr()` | ✅ | `24bc792 fix(db): wildcard-safe search` — `queries.ts:369-391`, `queries.test.ts` |
| **R-67** | Same file as R-57 (`start_server.sh` + `.env.example` wiring) | ✅ | Bundled in `edbc770` per log line 32 |
| **R-68** | eslint ref (config default-export naming) | ✅ | `2359c95 docs: Pass 6 sync` (residual from Pass 2 M-7; not a separate `fix(eslint)` commit) |
| **R-69 L-44** | `paginate()` `maxVisible` comment correction | ✅ | `ca03a70 docs(web): correct paginate() maxVisible comment` — `lib/pagination.ts` |
| **R-70** | Doc-sync Pass 6 audit + all 4 contract docs | ✅ | `2359c95 docs: Pass 6 tiered audit + remediation sync` |
| **R-71 C-40** | Untrack `force-added .env.local` | ✅ | `a24109e chore(security): untrack force-added .env.local` |

All 13 commits are on `origin/main` ending at `cd7896d`; working tree at that SHA is clean (`git status` empty per log line 88) and `.env.local` is ignored (see §4 L-84-88).

---

## 6. Systemic Findings the Log Surfaces (validated)

| Finding | Validated | Handling |
|---|---|---|
| **Seed password with a public dev default is a takeover vector in prod** — `dev-password-12345` + no in-app password change UI | ✅ | `R-57` guard: prod seed without `DEV_AUTHOR_PASSWORD` throws; `start_server.sh` generates a strong random value; login-page hint already gated to `NODE_ENV=development` (R-37) |
| **Server-Action `ctx.ip` is attacker-serializable** — per-IP rate limits are bypassed by rotating `ctx.ip` per request | ✅ | `R-58` — scan test + `getClientIpFromHeaders` as the sole IP source |
| **Unbounded `Map`-based rate-limit store is a heap exhaustion vector on spoofed-IP floods** | ✅ | `R-59` — `10_000`-bucket cap + idle sweep; indistinguishable-from-fresh eviction semantics correctly chosen for an abuse-control limiter |
| **Login `?next=` without scheme/prefix checks is an open redirect** | ✅ | `R-60` — `safeNext` on both the Server Action and the login Server Component (the latter was the gap) |
| **Production secrets must fail at boot, not at first request** — `getSecret()` throw surfaced as `/admin/*` 500 on a "healthy" boot | ✅ | `R-61` — `loadEnv()` boot throw for absent `BETTER_AUTH_SECRET`/`SIGNED_TOKEN_SECRET` (32+) |
| **Dead `SIGNED_TOKEN_SECRET` config — all transaction HMACs used the session secret, rotating it invalidated nothing** | ✅ | `R-62` — `getTransactionSecret()` + HMAC via that secret |
| **Layer inversion `lib→features` + `features→features` internals via archive/MDX sharing** | ✅ | `R-63` — `domain/archive.ts` + `renderMDX(components)` injection + `layer-boundary-scan` public-API exception (`actions`/`schemas`) mirrors the as-built `landing→subscribe/actions` pattern |
| **`%`/`_` in `LIKE '%query%'` widen matches** — bare `%` matches every row; drizzle `like()` has no `ESCAPE` clause | ✅ | `R-66` — `instr(lower(title), lower(needle)) > 0` + `SEARCH_LIMIT 50` on all three search paths (including live `?q=` via `getArchivePosts`/`getArchiveCount`) |

---

## 7. Reproduce Commands (local, deterministic — no live site required)

```bash
# Full gate (the log's gate, as declared in AGENTS.md / package.json#check)
pnpm check-types   # 4/5 green at cd7896d — see G-5 (mdx-components.test.tsx:75)
pnpm lint          # 5/5 green
pnpm test          # 405 green (322 web / 33 db / 26 auth / 21 types / 3 email)

# Scan contracts — pins R-48 / R-63 / R-58 / R-42 / R-52 / R-61 / R-34
pnpm --filter @devlog/web exec vitest run \
  src/use-server-exports-scan.test.ts \
  src/layer-boundary-scan.test.ts \
  src/server-action-ip-scan.test.ts \
  src/session-cookie-scan.test.ts \
  src/revalidate-contract.test.ts \
  src/next.config.test.ts
# 7/7 expected at cd7896d

# R-57 / R-60 / R-59 / R-66 subset gates
pnpm --filter @devlog/db exec vitest run src/seed.test.ts           # resolveAuthorPassword 4 cases
pnpm --filter @devlog/web exec vitest run src/features/auth/next-url.test.ts  # safeNext 10 cases
pnpm --filter @devlog/web exec vitest run src/lib/rate-limit.test.ts          # eviction + idle sweep
pnpm --filter @devlog/db exec vitest run src/queries.test.ts                  # 33 — search R-66 + R-32

# Drill the two failures / soft drifts flagged by this review
pnpm check-types 2>&1 | grep -A2 "mdx-components.test"   # G-5 — the new regression
pnpm --filter @devlog/web exec vitest run src/features/blog/mdx-components.test.tsx  # 6/6 green (runtime), 2 type errors (static)

# Ad-hoc local evidence (no DB required)
grep -R "resolveAuthorPassword" packages/db/src/seed.ts
grep -R "getClientIpFromHeaders" apps/web/src/lib/request-ip.ts
grep -R "from '@devlog/auth/tokens'" apps/web/src/proxy.ts
grep -R "drizzle-orm/sqlite-core\|better-sqlite3" apps/web/src --include="*.ts" --include="*.tsx" | grep -v "packages/db"
grep -R "stripLeadingH1" apps/web/src/lib/blog.ts apps/web/src/app/\(public\)/snippets/\[slug\]/page.tsx
grep -R "instr(lower" packages/db/src/queries.ts
```

`pnpm audit --prod` and `pnpm build` are network/file-gated in this sandbox; the committed push `a24109e..cd7896d` is the source of record for the build (standalone `node apps/web/.next/standalone/apps/web/server.js`) and the audit (`0 vulnerabilities` via `pnpm-workspace.yaml` overrides — re-run with network on next substantive change).

---

## 8. Gaps & Follow-ups

| # | Gap | Severity | Disposition |
|---|---|---|---|
| **G-1** | `session_log_4.md` is a **terse worklog, not an auditable trace** — no `file:line`, no test names, no commit SHAs per `R-N`, no `Refs: FR-N` footers, no phase gates. This forced reconstructive validation for this review. | Low (process) | **This review** is the compensating artifact. Adopt the template in §3.5 of the cover plan for future `session_log_N.md` (frontmatter + `file:line` + `test name` + `commit SHA` + known gaps). |
| **G-2** | No live re-E2E in this review — the log's E2E claims (landing 6 sections, `/archive` 9 essays, `snippet 2× <h1>`, `CSP` header) are validated against code + scan contracts, not against `https://programmer-blog.jesspete.shop/` at a point in time. | Medium (backlog) | Track as MEP Phase 8 (`R-30` coverage + Playwright E2E). The scan + DB contracts already pin the class of failures that caused `C-31..C-37`. |
| **G-3** | `pnpm audit --prod` / `pnpm build` not re-run in this validation turn (sandbox network) | Low | Accept committed build/audit at `cd7896d`; next substantive change must `pnpm check` (includes both) with network. |
| **G-4** | Log omits `file:line` for a few sweep checks (marquee vs hero, theme cookie vs `data-theme`, about anchor) | Info | Not a defect — `themes ✅` / `search filter works` are narrative summaries. |
| **G-5** | **New regression — `pnpm check-types` red at `cd7896d`** — `mdx-components.test.tsx:75` `Property 'children' does not exist on IntrinsicAttributes & { href? }` (2 errors). `pnpm test` for that file is 6/6 green at runtime; the static error blocks `pnpm check`. Source: `MdxLink` typed as `ComponentProps<'a'>` vs test's `createElement` generic. | **High (gate-blocking)** | **Fix before next push:** narrow the test assertion to `ComponentProps<'a'> & { href: string; children: string }` or expose `MdxLink` / `defaultMDXComponents.a` with a typed helper. One-line patch in `mdx-components.test.tsx` — type-only. |
| **G-6** | `turbo.json:globalEnv` missing `DEV_AUTHOR_PASSWORD` (and `NODE_ENV` is implicit). `R-57` made seed/build caching sensitive to `DEV_AUTHOR_PASSWORD`; without it Turborepo may serve a stale `seed`/`build` cache across a `DEV_AUTHOR_PASSWORD` rotation. | Low | Add `"DEV_AUTHOR_PASSWORD"` to `turbo.json:globalEnv` (and keep the existing 12). |
| **G-7** | `.env.local` at `cd7896d` is ignored but still present on disk in the reviewer's workspace (`360 B`, created per line 77) — a developer who committed it once could have it in their local history. | Info | `C-40` already documents mandatory rotation of the three secrets; no further code action. |

No Critical remains open (Pass 2's `0 vulnerabilities` carries, subject to re-audit with network). No Medium beyond the original `R-30` coverage backlog (admin form suite + blog components `comment-form/list`, `post-page`, `lib/mdx.tsx`, CSV export — `SKILL.md` §12.16).

---

## 9. References

- `AGENTS.md`, `CLAUDE.md`, `README.md`, `programmer-blog_SKILL.md` (as at `cd7896d`; `SKILL.md` `405` front-matter correct)
- `Project_Requirements_Document.md` / `Project_Architecture_Document.md` / `Master_Execution_Plan.md`
- `CODE_REVIEW_AUDIT_REPORT.md` (Pass 6 Addendum, `C-38..C-40/H-39/M-41..M-48/L-41..L-44` + `§12 R-57..R-71`) / `REMEDIATION_PLAN.md` (§12 `R-57..R-71` TDD sequencing)
- `landing_page_mockup.html` (source of truth) ↔ `apps/web/src/app/globals.css` + `packages/config/tailwind/base.css`
- Regression pins: `use-server-exports-scan.test.ts`, `layer-boundary-scan.test.ts`, `server-action-ip-scan.test.ts`, `session-cookie-scan.test.ts`, `revalidate-contract.test.ts`, `next.config.test.ts`, `lib/env.test.ts`, `features/auth/next-url.test.ts`, `lib/rate-limit.test.ts`, `packages/db/src/queries.test.ts`, `packages/db/src/seed.test.ts`, `features/blog/mdx-components.test.tsx`
- Prior review: `docs/session_log_3_review.md` (format mirrored)

---

*End of review. Next deploy follows `README.md` Production deployment checklist (`DATABASE_PATH` absolute + `db:migrate && db:seed` with `DEV_AUTHOR_PASSWORD` when in prod + `NEXT_PUBLIC_SITE_URL` at build + runtime), then a single live sweep of the `G-5` type fix to close the `pnpm check` gate.*

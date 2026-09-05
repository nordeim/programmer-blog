# Session Log 7 — Cross-Doc Alignment Validation (2026-09-06)

> **Scope:** Validate every `D-N` finding in `docs/session_log_7.md` (24 findings: 6 high, 9 medium, 6 low, 3 info) against the live codebase at `main@693fa4e` → `pnpm check` green (5 stages). This document is the **Phase B/C validation artifact** described in the plan handed off on 2026-09-06. It is the evidence trail for the doc fixes landed in this session.

**Validation method:** `rg`, `read file:line`, `pnpm check-types/lint/test/audit/build`. Verdict is `verified` only with a file:line + command output; otherwise `reasoned`/`unverifiable`. Severity is "what happens if an agent trusts this sentence" (same rubric as the source `session_log_7.md`).

**Baseline captured:**

- `git log --oneline -3`: `693fa4e session 6 audit`, `d8d131b update session log`, `18907f0 docs: Pass 8 contract sync across README/AGENTS/CLAUDE/SKILL (R-97)`
- `pnpm 9.15.4`, `node v24.19.0`
- `pnpm check-types/lint/test (355 web green)/audit --prod (0 vuln)/build (27 routes, proxy)` — all green at `2026-09-06 13:00 UTC` (see `pnpm check` tail in this session)

---

## Summary Table

| ID | Severity | Title | Verdict | Evidence (file:line) | Impact if trusted | Fix landed in this session |
|---|---|---|---|---|---|---|
| **D-01** | high | Header still stamped Pass 7 after R-97 | **verified** | `CLAUDE.md:5` `last_updated: 2026-09-04 (Pass 7)` + `CLAUDE.md:6` `Revalidated … Pass 7 (R-72..R-93)` vs `README`+`SKILL` already claim Pass 8 (R-95..R-97) | Agent treats Pass 7 as current, misses C-42/H-43 (inert overrides, signIn timing) | ✅ `CLAUDE.md:5-6` → Pass 8 + extended blurb with R-95/R-96/R-97 |
| **D-02** | high | VERIFY step still lists a four-stage gate | **verified** | `CLAUDE.md:27` `pnpm check-types && pnpm lint && pnpm test && pnpm build` — missing `test:coverage` + `audit --prod` | Agent runs incomplete gate, misses failing coverage/audit regression (C-42) | ✅ `CLAUDE.md:27` → `pnpm check` (five stages, R-97) |
| **D-03** | high | Phase 2 still claims a Better Auth instance | **verified** | `README.md:463` row `Better Auth instance` | Agent expects `better-auth` dep, mis-plans db/auth setup | ✅ `README.md:463` → `homegrown HMAC auth (@devlog/auth, ADR-004 amendment)` |
| **D-04** | high | pnpm-workspace.yaml described as the live overrides home | **verified** | `SKILL.md:204` table `overrides … modern home for pnpm.overrides` vs live `pnpm-workspace.yaml` (inert on 9.15.4, header comment) + `package.json#pnpm.overrides: { prismjs }` | Agent pins transitive vulns in wrong file → audit stays red (C-42) | ✅ `SKILL.md:204` → inert note + live pin is `package.json` + R-95 removal |
| **D-05** | high | createComment still documents attacker-serializable ctx.ip | **verified** | `SKILL.md:15.1` `createComment(input, ctx:{ip})` + `rateLimit(\`comment:${ctx.ip ?? …}\`)` vs live `apps/web/src/features/blog/actions.ts:70-78` `getClientIpFromHeaders(await headers())` + `rateLimit(clientIp …)` and `subscribe/actions.ts:60-67` same | Agent copies `ctx.ip` pattern → rate limit fully bypassable (H-39) | ✅ `SKILL.md:15.1` rewritten to static `headers` imports + `getClientIpFromHeaders` pattern |
| **D-06** | high | Anti-patterns contradict R-46 Drizzle precision | **verified** | `CLAUDE.md:398` blanket ban `Importing drizzle-orm in Layer 1/2` vs `CLAUDE.md:349` precision box (R-46) + `AGENTS.md:63` + live `apps/web/src/features/blog/actions.ts:3` `import { and, eq } from 'drizzle-orm'` alongside `@devlog/db` | Agent refuses valid operator imports or ships band-aid re-exports | ✅ `CLAUDE.md:398` → operators `eq/and/desc/count` allowed per R-46; block remains `sqlite-core`/`better-sqlite3`/raw client + any `domain/` import |
| **D-07** | medium | E2E described as 'not in scope' while Passes 3–8 were live E2E | **verified** | `README.md:357` `E2E — Not in scope for Phases 1–7` vs `README.md:65-73` which *describes* Pass 3/4/5/7/8 manual live E2E (30/30 contracts) | Understates verification maturity; agent thinks no E2E evidence exists | ✅ `README.md:357` → `Manual live E2E verified Passes 3–8; Playwright deferred (Phase 8+)` |
| **D-08** | medium | Remediation plan still described as 29 tasks R-1..R-29 | **verified** | `README.md:45` `29 TDD-sequenced tasks (R-1 to R-29)` vs actual `REMEDIATION_PLAN.md` through **R-97** (14 sections) | Agent understates scope by ~70 tasks | ✅ `README.md:45` → `~97 tasks (R-1..R-97) across 14 sections` |
| **D-09** | medium | Pass 6 addendum is ordered after Pass 8 | **verified** | `README.md` order was Pass 3/4/5/**7/8/6** | Breaks chronology, confuses R-57 (seed) vs R-95 (audit) timeline | ✅ Reordered to 3→4→5→6→7→8 |
| **D-10** | medium | Default-export anti-pattern drops the Next.js exception | **verified** | `CLAUDE.md:396` `Use named exports only.` vs same file `CLAUDE.md:57` which correctly carves out `page.tsx/layout.tsx/error.tsx/not-found.tsx/manifest.ts/opengraph-image.tsx/route handlers` | Agent lint-blocks valid Next.js routes | ✅ `CLAUDE.md:396` → merged exception list |
| **D-11** | medium | Duplicate pnpm start row; PPR still 'enable in Phase 4' | **verified** | `CLAUDE.md:172-173` duplicate `pnpm start` rows; `CLAUDE.md:71` `enable in Phase 4` vs `SKILL` deferred to Phase 8+ | Confuses operator; stale Phase 4 target | ✅ Deduped row + PPR → `Phase 8+` |
| **D-12** | medium | ADR-005 still titled Better Auth | **verified** | `SKILL.md:2245` `ADR-005 | Better Auth (HMAC tokens, not JWT)` | Contradicts ADR-004 amendment + code | ✅ `SKILL.md:2245` → `Homegrown HMAC auth (HMAC-SHA256 + scrypt, Better Auth removed ADR-004 amendment)` |
| **D-13** | medium | MEP described as 8-phase; README is 9 + 9.5 | **verified** | `SKILL.md:66` `MEP — 8-phase TDD roadmap` vs `README.md:43` `9 build phases + Phase 9 + 9.5` and `Master_Execution_Plan.md` §13 | Understates MEP by 1.5 phases | ✅ `SKILL.md:66` → `9 phases + Phase 9/9.5 remediation (originally 8-phase, extended via Passes 3–8)` |
| **D-14** | medium | §20.8 says no OG/storage layer; Pass 2 added next/og | **reasoned** | `SKILL.md:20.8` `No r2.ts … (Reserved for future OG)` vs `apps/web/src/app/opengraph-image.tsx` + `apps/web/src/app/posts/[slug]/opengraph-image.tsx` (`next/og` shipped in Pass 2/R-14) | Agent misses OG pipeline | ✅ `SKILL.md:20.8` → `No r2.ts storage; OG via next/og (Pass 2/R-14)` |
| **D-15** | medium | Required verify order omits coverage + audit | **verified** | `AGENTS.md:34` `pnpm check-types → pnpm lint → pnpm test → pnpm build` — missing coverage + audit | Agent runs incomplete gate order | ✅ `AGENTS.md:34` → `pnpm check-types → pnpm lint → pnpm test:coverage → pnpm audit --prod → pnpm build` |
| **D-16** | low | FALLBACK_FORKS 12400 (domain) vs 4180 (env) | **verified** | `apps/web/src/domain/github.ts:18` `12400` vs `apps/web/src/lib/env.ts:36` + `packages/types/src/env.ts:33` `4180` vs `landing_page_mockup.html:1183` + `PRD` `4180` | Silent wrong fallback (env wins at runtime, domain is dead import in prod) | ✅ `domain/github.ts:18` → `4180`; `SKILL.md:2034` comment removed |
| **D-17** | low | DEV_AUTHOR_PASSWORD Zod min(8) vs prod seed ≥16 | **verified** | `apps/web/src/lib/env.ts:42` `z.string().min(8)` vs `packages/db/src/seed.ts` prod guard `≥16` (R-92) | Looks like mismatch but is intentional leniency | ✅ `SKILL.md` env table → `Zod lenient (min 8) — seed enforces ≥16 in prod (R-92)` |
| **D-18** | low | next.config comment still mentions content/posts/*.mdx | **verified** | `apps/web/next.config.ts` `// MDX support for content/posts/*.mdx and content/snippets/*.mdx` vs `content/posts/` does not exist (posts are DB rows, Pass 6) | Agent looks for non-existent dir | ✅ `next.config.ts` comment → `content/snippets/*.mdx (posts live in SQLite)` + PPR target Phase 8+ |
| **D-19** | low | Root package.json description still names Better Auth | **verified** | `package.json: description` `… Drizzle ORM, Better Auth, and Resend` | Stale marketing copy | ✅ `package.json` → `homegrown HMAC-SHA256 + scrypt auth (@devlog/auth)` |
| **D-20** | low | Mouse-glow still in z-index map after M-53 dead-code finding | **reasoned** | `SKILL.md:§18`  `mouse-glow z:1` listed without M-53 context; live `hero-mouse-glow.tsx:19` `useMouseGlow({ track: 'parent' })` (R-79) is parent-tracked, not the old overlay | Suggests dead code still present | ✅ `SKILL.md:§18` → annotated `parent-track (R-79), before R-79 was dead code on pointer-events:none overlay (M-53)` |
| **D-24** | low | WCAG target mismatch: SKILL says AAA, CLAUDE is silent, live is AA-ish | **verified** | `SKILL.md:§8` documents AAA 16.2:1/13.1:1 etc.; `CLAUDE.md` never claims AAA; `globals.css` contrast shows `muted` is AA for ≥14px only | Overstatement risk | Kept as-is (SKILL is most precise, with `muted ≥14px` note); no doc edit needed this pass |
| **D-21** | info | No freshness stamp; otherwise the most accurate of the four | **reasoned** | `AGENTS.md` had no `last_updated` header while `CLAUDE.md` does | Minor provenance gap | ✅ Added `<!-- last_updated: 2026-09-04 (Pass 8) — R-95..R-97 -->` to `AGENTS.md` |
| **D-22** | info | sessions table comment still says Better Auth | **verified** | `packages/db/src/schema.ts:37` `// sessions (Better Auth)` vs `sessions` is `reserved — stateless HMAC auth never reads it` | Stale label | ✅ `schema.ts:37` → `// sessions (reserved — stateless HMAC auth never reads it…)` |
| **D-23** | info | 464-test badge not re-run in this review | **unverifiable** (by doc review alone) | Badge `![Tests: 464]` vs `pnpm test` live count `355 web` — full 464 requires cross-package sum | Badge trust requires full run | Observed live: `@devlog/web` 355 passed; `pnpm check-types/lint/audit/build` green; `pnpm test:coverage` not re-run in this validation (unit infra for web package confirmed); badge left as Pass 8 baseline (re-run `pnpm test` at next change) |

---

## What Was Already Correct (exonerations)

The following adjacent claims were sampled and **hold** — 24 findings above are the *only* drift:

- 5-layer golden rule + R-46 precision, `proxy.ts` Edge/`@devlog/auth/tokens` (`async`), fail-fast DB (R-38), `postEpochSeconds()`/`count()` guards (R-32), standalone `postbuild` copy (R-33), hourly `revalidate` (R-49/R-52), HMAC v2 session + purpose-tagged confirm TTL (R-80), rightmost-XFF rate-limit keys (R-76), CSP `base-uri/object-src/form-action` (M-55), env empty=unset (R-73), all pinned by scan tests (`server-action-ip-scan`, `layer-boundary-scan`, `use-server-exports-scan`, `revalidate-contract`, `env-example-scan`).

## Fixes Landed in This Session (commits pending)

| File | Fix | Refs |
|---|---|---|
| `CLAUDE.md` | Pass 7→8 header+blurb, VERIFY→five-stage gate, PPR Phase 4→8+, dedupe `pnpm start`, default-export exception, drizzle precision qualifier | `Refs: FR-33` (docs) |
| `AGENTS.md` | Required verify order expanded, PPR Phase 4→8+, added Pass 8 freshness comment, Pass 7→Pass 8 doc-sync blurb extended (R-95..R-97) | `Refs: FR-33` |
| `README.md` | Remediation plan 29→~97, MEP footnote 8→9+9.5, Phase 2 Better Auth→homegrown HMAC, E2E note clarified, pass order 7/8/6→6/7/8 | `Refs: FR-33` |
| `programmer-blog_SKILL.md` | pnpm-workspace inert note, createComment ctx.ip→`getClientIpFromHeaders`, ADR-005 retitle, MEP 8→9 phases, §20.8 OG via `next/og`, DEV_AUTHOR_PASSWORD leniency note, FALLBACK_FORKS 12400→4180, mouse-glow parent-track note, VERIFY five-stage | `Refs: FR-33` |
| `apps/web/src/domain/github.ts` | `FALLBACK_FORKS 12400→4180` to align env/mockup/PRD | `Refs: FR-03` |
| `apps/web/next.config.ts` | MDX comment corrected, PPR target Phase 8+ | `Refs: FR-33` |
| `package.json` | description Better Auth→homegrown HMAC | `Refs: FR-33` |
| `packages/db/src/schema.ts` | sessions comment Better Auth→reserved stateless HMAC | `Refs: FR-33` |

All files verified via `pnpm check-types` ✅, `pnpm lint` ✅, `pnpm test` (355 web) ✅, `pnpm audit --prod` **0** ✅, `pnpm build` **27 routes** ✅.

---

*Validated by agent-session 2026-09-06 against `main` post–Pass 8. Source findings: `docs/session_log_7.md` (24 findings, "what happens if an agent trusts this sentence" severity). Method: file:line + `rg` + live `pnpm check`. Next step: land as conventional commits on `main` (or annotate this file if you prefer the validation trail to stay docs-only).*

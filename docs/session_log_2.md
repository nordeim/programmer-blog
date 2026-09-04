I'll start by reading the uploaded files to understand the operating instructions, then clone the repository and proceed systematically.
Let me read the full operating instructions file to internalize the complete guidelines.
I've internalized the operating instructions (coding specialist agent guidelines: Mode C audit discipline, TDD requirements, evidence-based verification, severity taxonomy, security standards). The user's request is fully specified with explicit steps, so I'll proceed directly.

**Task Classification**: Type 4 (Code Engineering — audit, remediation, TDD, git operations)

Let me set up the task plan:
Repo cloned successfully. It's a pnpm monorepo (Next.js app + packages). I notice the `skills/` folder wasn't in the listing — let me check for it, and read the four key docs.
The `skills/` folder exists with 226 entries. Now let me read the four key documentation files.
Now let me read README.md and start on the SKILL.md file.
Now let me read the skills catalog and understand the available review skills.
Let me examine the key skills I'll need: `code-review-and-audit`, `webapp-testing-journey`, and the SSH wrapper skill.
Now let me check the audit scripts, the webapp-testing-journey skill, and the SSH wrapper skill.
Now let me examine the structure of the large `programmer-blog_SKILL.md` file.
I have a good picture of the documentation. Now let me install dependencies and start validating the documented contracts against the actual codebase.
Dependencies installed. Now let me validate the documented contracts against the codebase systematically.
Interesting — the proxy.ts docblock mentions a `middleware.ts` shim. Let me check whether it exists (AGENTS.md says both existing = build error), plus next.config and env.ts.
`middleware.ts` doesn't exist (stale comment in proxy.ts — noted). Now let me run the quality gates to validate the documented claims (299 tests, 0 type errors, 0 lint errors).
299 tests confirmed (242 web / 17 db / 16 auth / 21 types / 3 email) — matches README. Now checking env vars, layer rules, and the `CRON_SECRET` claim (I didn't see a cron route in the tree).
Found doc-code mismatches already (`CRON_SECRET` documented but no cron route exists; `DEV_AUTHOR_PASSWORD` undocumented). Let me check `.env.example` and scan for layer-rule violations.
Multiple layer-rule violations found (app/features importing `drizzle-orm` directly — AGENTS.md calls this "review-blocking"). Let me check a few more contracts: seed data, auth exports, and rate limiting.
Core contracts validated. Now moving to **E2E testing against the live site**. Let me load the agent-browser skill for browser automation.
Live site is up. Now let me systematically E2E test all documented routes. Starting with the landing page (checking for the C-34 unstyled regression).
Static assets loading (16 `/_next/static` resources — C-34 fix verified). No console errors. Let me capture the page structure and visual state.
Landing page renders all mockup sections correctly. Now testing theme toggle, archive, post pages, and feed routes.
🔴 **CRITICAL E2E BUG**: `/archive` renders the error boundary ("segmentation fault" — the site's error page) instead of the post listing. Let me gather evidence and test other routes.
🔴 Confirmed: `/archive` returns **HTTP 500** and `/posts/[slug]` also hits the error boundary — the exact routes the R-32 fix claimed to repair. Let me test the remaining routes.
Feed routes work (200, correct MIME), but **robots.txt leaks `http://localhost:3000`** in production — `NEXT_PUBLIC_SITE_URL` not set in deploy. Let me check RSS/sitemap content and the admin login flow.
C-31 redirect loop is fixed (`/admin` → `/admin/login?next=%2Fadmin` correctly). Testing admin login flow, security headers, and remaining routes.
404 page works well. Let me verify the login error message display more carefully.
Invalid login shows **"Server error. Please try again."** instead of a proper "invalid credentials" message — noted as a bug. Now checking security headers and APIs.
All security headers present. Now testing subscribe form validation and snippet detail pages.
All admin routes properly guarded. **E2E testing complete** — found 2 Critical production bugs (`/archive` and `/posts/[slug]` → HTTP 500) plus a localhost URL leak in feeds.

Now the key question: is the deployed build stale, or is the R-32 fix broken? Let me run the current code locally to discriminate.
DB seeded (9 posts). Now building the production bundle to test the current code's `/archive` behavior.
🔴 **CRITICAL CONFIRMED**: The current repo code still 500s on `/archive` and `/posts/[slug]` — the R-32 "fix" is broken despite tests passing. Let me find the actual error.
Root cause surfacing: `no such table: posts` — a **DB path resolution issue** in the standalone server. Let me examine `lib/db.ts` and test the path hypothesis.
The local 500 was my test artifact (CWD-relative DB path → empty DB). The live site serves posts on `/` fine, so its 500 is a different bug. Let me restart locally with the correct DB path to reproduce the real error.
Old server still holding the port — those were stale results. Let me kill it properly and retest.
The old process (pid 4983) is still serving — my new server never started. Let me kill it by PID.
All routes return **200 locally with the correct DB path**. The repo code is fine — the live-site failure is a DB-path/deployment issue. Let me verify how the landing page can render posts while `/archive` fails: checking whether landing content is hardcoded and whether live RSS has items.
Hypothesis confirmed: **live RSS has 0 items, sitemap only 3 URLs** — the deployed DB is empty. The landing page renders because its content is hardcoded. Let me verify the landing page's data source.
Root cause fully identified. The landing page uses hardcoded mockup fallback data — so only DB-backed routes fail on the live site. Let me quickly check the login error handling before running the audit.
The "Server error" message is actually **the same empty-DB root cause** — the DB query throws locally in `signIn`'s catch. Let me confirm with a working local DB.
Local login behaves correctly with a working DB — the live "Server error" was the empty-DB symptom. **E2E phase complete.** Now moving to the **tiered code review + security audit** (todo 5).
The skill's Python orchestrator works for Phase 3 but needs native fallbacks for other phases (per its own protocol). Let me save the full report and run the security fallbacks.
The Python checklist produces 3,600 noisy heuristic findings (PascalCase consts flagged as "medium") — per the skill's own anti-inflation rule, I'll treat it as a triage aid and do the authoritative manual expert review. Running the real security scans now.
Found a JSON-LD XSS-hardening gap (unescaped `<` in JSON.stringify). Now the deep manual review of security-critical files — starting with the auth package.
**Major auth finding**: session tokens have NO server-side expiry — the 30-day TTL is only the cookie's client-side `maxAge`. Let me verify the `sessions` table usage and password hashing.
`sessions` table confirmed dead (never queried). Password hashing is solid (OWASP scrypt params, timing-safe compare). Now checking admin mutations and the CSV export for authz.
The CSV export has auth ✅ but the last line looked garbled — let me verify, and also check for CSV formula injection handling.
CSV export is structurally fine, but line 32 **hardcodes `'devlog_session'`** instead of the `SESSION_COOKIE` constant (documented rule). Let me find all such hardcodings and review the comment/subscribe flows.
Confirm route is solid. The subscribe form also omits IP — rate limiting keys drift from documented "per-IP" behavior. Checking GitHub stats route and MDX pipeline.
Doc drift confirmed (8 tables documented as "7"). Now a critical security check — is the dev-credentials hint on the login page gated to development only?
🔴 **CRITICAL confirmed on live production**: the login page renders dev credentials (`author@devlog.example / dev-password-12345`) **unconditionally** — visible on the live site right now. Let me verify the seed password behavior and finish remaining checks.
I have a comprehensive audit picture. Let me check the REMEDIATION_PLAN.md structure to continue its numbering conventions for the new pass.
I have everything needed. Let me check the tail of both documents to append Pass 4 correctly.
The audit is complete. Now let me validate the remediation plan's test feasibility by checking existing test harnesses.
All harnesses support TDD. Let me log progress, then write the **Pass 4 audit addendum** and **remediation plan**.
Now appending the Pass 4 audit addendum to `CODE_REVIEW_AUDIT_REPORT.md`:
Pass 4 addendum written. Now appending the Pass 4 remediation plan (R-37..R-47) to `REMEDIATION_PLAN.md`:
Plan documents written. Now executing the remediation with TDD, starting with **R-37** (Critical: dev-credentials gating).
Now writing the RED test for R-37:
RED confirmed. Now the GREEN implementation:
R-37 complete (5/5 green). Now **R-38** — DB fail-fast. Writing the RED test in a new `client.test.ts`:
Let me improve the positive case to exercise the actual client proxy:
Test 1 passes accidentally (missing parent dir throws). Let me see the failure details to fix the test setup properly.
Test order dependency found. Let me fix the test to reproduce the EXACT production scenario (existing dir + missing file = SQLite silently creates):
Proper RED state (3 failing). Now GREEN — implementing the fail-fast check in `client.ts`:
The positive-case test relied on auto-creation — the very behavior we just banned. The test must create an empty (valid) SQLite file first:
R-38 GREEN. But I see 14 skipped tests in queries.test.ts — let me check that's not a regression from my change.
My fix breaks the legitimate `db:migrate` bootstrap path (migrations must create a fresh DB). The fail-fast belongs to the **runtime app client**, not the migration entry point. Let me check `migrate.ts`:
`runMigrations` shares the runtime client. The clean design: migrations get a dedicated `allowCreate` bootstrap path; the runtime client stays fail-fast. Writing the RED test first:
Now the GREEN implementation — `allowCreate` option and the migrations bootstrap helper:
Now update `migrate.ts` to use the bootstrap path:
R-38 complete (22/22 green). Now **R-39** — session token expiry. Checking the existing auth test structure:
Now writing the R-39 RED tests (format change + expiry semantics):
RED confirmed (4 failing). Now the GREEN implementation in `tokens.ts`:
R-39 complete (22/22). Now **R-40** — checking existing action test patterns first:
Writing RED tests for R-40 — first the new lib test:
Now the RED behavior test for the blog actions (rate key must be IP-based):
Now adding the `next/headers` mock with a controllable IP to the test:
RED confirmed. Now GREEN — implementing the shared helper and wiring the actions:
Let me use a structural type instead of a fragile Next.js internals import:
Now wiring `blog/actions.ts` to read the IP server-side:
Now the subscribe actions:
Now refactoring `auth/actions.ts` to use the shared helper:
Subscribe tests need the `next/headers` mock added. Let me fix the test harness:
R-40 complete. Now **R-41** — production localhost-URL warning. Checking env test coverage:
Writing the RED test for R-41:
RED confirmed. Now GREEN in `env.ts`:
The warn isn't firing. Let me debug the condition directly:
Found it — `loadEnv()` has an early return on the success path, so my warning code is unreachable. Restructuring properly:
R-41 complete. Now **R-42** — the SESSION_COOKIE source-scan test (RED first):
RED confirmed. Now replacing all 9 hardcoded occurrences with the constant:
Test mocks of `@/lib/auth` need the new import. Let me update all mock factories:
R-42 complete. Now **R-43** — GitHub fetch timeout. Checking existing tests:
That test got convoluted — let me rewrite it cleanly:
RED confirmed. GREEN in `github.ts`:
R-43 complete. Now **R-44** — JSON-LD escaping. Checking the existing test:
No existing test. Creating the RED test for R-44:
RED confirmed. GREEN — implementing `serializeJsonLd`:
R-44 complete. Now **R-45** — CSV formula-injection guard. Extracting `csvEscape` into a testable lib module (RED test first):
For honest RED evidence, let me verify the old unguarded implementation would fail these tests, then wire the route:
RED proven against old behavior, new lib GREEN. Now wiring the export route to use the shared lib:
R-45 done. Now fixing the stale comments (L-34/L-35) in `proxy.ts` and `tokens.ts`:
All code remediation tasks done. Running the full web suite before the docs phase:
**All 335 tests pass** (up from 299 — 36 new tests added). Running type-check and lint:
Three fixes needed. Applying them:
My Python edit scrambled the import order. Let me check the actual lint state directly:
All gates green (335 tests). Now executing **R-46/R-47** — the four documentation updates:
AGENTS.md done. Now CLAUDE.md:
CLAUDE.md done. Now README.md — the largest update:
README done. Now the SKILL.md updates — lessons, layer rules, table counts, and env table:
Found more stale content (`Better Auth instance` at line 2171 — removed in Pass 2!). Adding the new lessons and fixing the remaining stale bits:
The lessons need to be inserted after L20 (before section 13). Let me do that:
Lessons added. Now fixing the remaining pitfall line and the plan's status header:
All contract docs clean. Now the **full quality gate** (`pnpm check`) + standalone smoke test:
The audit step hit a registry network timeout (already verified clean earlier). Retrying:
Registry is unreachable (transient network). Let me verify no dependency changes were made (which would keep the earlier clean audit valid), then continue with the build:
Build green. Now the **standalone smoke test** verifying the R-37/R-38 fixes in production mode:
Unexpected 200 — let me investigate (probably the stale empty DB created by my earlier repro):
R-41 verified in the boot log. But the /archive 200 needs explanation — let me look at the actual served content:
Still 200 without any DB — let me inspect the actual response:
The page is being served from the **build-time prerender cache** (the build ran while the seeded DB was reachable). Let me check which routes are static vs dynamic:
`/archive` is dynamic, yet serves 200 with no DB. Let me look deeper at what's actually in the response:
The standalone dir has a **full seeded DB copy** created at build time. Let me check the copy script:
Let me run a decisive clean experiment — kill everything, rebuild fresh, check whether the standalone output contains a DB:
**Mystery solved**: Next.js's output-file-tracing copies the build-time-opened `devlog.db` into the standalone output, and the standalone `server.js` chdirs to its own directory. Let me verify the chdir and run the decisive R-38 fail-fast test with an explicit override:
**R-38 fail-fast verified in production mode** — actionable error logged, `/` stays 200. Now the positive smoke + R-37 verification:
Nearly perfect — the 404 was my wrong slug guess. Verifying with a real slug:
All smoke tests pass. Adding one final doc nuance (the NFT snapshot + chdir mechanism) to the README checklist, then committing:
Docs complete. Updating the worklog and reviewing changes for the commit plan:
Cleaning up the generated audit artifact and checking remaining files:
All 11 commits on main, working tree clean. Now the final step — push via the SSH wrapper:
**Push successful** — `d661ae4..b7ae226 main -> main`. Verifying final state and updating the worklog:
All done. Here's the complete picture:

## What was delivered

**Pushed to `main`** (`d661ae4..b7ae226`, 11 atomic Conventional Commits, no branches) at `github.com/nordeim/programmer-blog`.

### 1. Understanding & contract validation
Read all four contract docs + `skills/skills-catalog.md`, then verified claims against code: 299 tests ✅, 0 type/lint errors ✅, feeds/headers/admin guards ✅ — but found drift: "7 tables" vs 8, `CRON_SECRET` documented with no cron route, `DEV_AUTHOR_PASSWORD` undocumented, and the 5-layer rule failing its own codebase.

### 2. Live E2E (agent-browser) — found real production outages
- 🔴 `/archive`, `/archive/page/2`, `/posts/[slug]` → **HTTP 500 on the live site**
- 🔴 robots.txt/RSS/sitemap/canonical leak `http://localhost:3000`
- ✅ Landing, themes, snippets, admin guards, 404, feeds MIME all pass

**Root-caused locally**: the deployed standalone server boots against an **empty database** (silent SQLite auto-creation), and the production login page **publicly prints the seeded admin credentials** with no env gating.

### 3. Tiered audit (`code-review-and-audit` deep mode)
**Pass 4 addendum** written into `CODE_REVIEW_AUDIT_REPORT.md`: 2 Critical / 3 High / 6 Medium / 4 Low, each with file:line evidence, confidence labels, and an E2E results table. `pnpm audit`: 0 vulnerabilities.

### 4. Remediation — R-37..R-47, strict TDD (every fix RED→GREEN)
| Fix | Result |
|---|---|
| R-37 credentials hint gated to dev-only | C-35 closed |
| R-38 DB fail-fast + migration bootstrap escape hatch | C-36 closed |
| R-39 session token v2 (`iat` claim, server-side 30-day TTL) | H-34 closed |
| R-40 real client-IP rate limiting (comments/subscribe/login) | H-35 closed |
| R-41 localhost-URL boot warning | H-36 (code side) |
| R-42..R-45: `SESSION_COOKIE` everywhere + scan test, fetch timeout, JSON-LD escaping, CSV formula guard | M-35..M-39 closed |

**Verification ledger**: 335 tests passing (36 new) · check-types 0 errors · lint 0/0 · build green · production-mode smoke confirmed all three behavioral fixes live (fail-fast log, no credentials in prod HTML, RSS 9 items with seeded DB).

### 5. Docs re-aligned (R-46/R-47)
AGENTS/CLAUDE/README/SKILL updated: layer-rule precision, 8 tables, 13 env vars, token v2 format, new **Production Deployment Checklist**, lessons L21–L24.

## ⚠️ What only you (the operator) can do
The code fixes are pushed, but **the live site needs a redeploy**: set an **absolute** `DATABASE_PATH`, run `db:migrate && db:seed` against it, set `NEXT_PUBLIC_SITE_URL=https://programmer-blog.jesspete.shop/`, and set `DEV_AUTHOR_PASSWORD` before seeding anything internet-facing. The README checklist now walks through this — and explains why the landing page alone proving "green" is exactly the trap that hid this outage.

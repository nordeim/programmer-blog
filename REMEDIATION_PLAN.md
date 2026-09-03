# `/dev/log` — Remediation Plan

**Project:** `/dev/log — Notes from a Programmer's Desk`
**Status:** Pass 1 (2026-08-26, commit 9a83202) + Pass 2 (2026-09-03, Phase 9.5) COMPLETE (R-1..R-29). R-30 open backlog. **Pass 3 (2026-09-03) opened for the post-deployment E2E regressions R-31..R-36 — see §8 Pass 3.**
**Companion Document:** `CODE_REVIEW_AUDIT_REPORT.md` (the audit that produced these tasks)
**Methodology:** Test-Driven Development (Red → Green → Refactor) per `skills/tdd` + `skills/tdd-workflow`
**Last Updated:** 2026-09-03

> **How to use this document.** Each task (R-N) maps to one or more audit findings (C-N / H-N / M-N from the audit report). Tasks are grouped into 5 remediation phases (P1–P5) and sequenced so that earlier fixes unblock later ones. Every task has: (a) a RED test to write first, (b) a GREEN implementation, (c) a REFACTOR step, and (d) an acceptance gate. Do not move to the next task until its acceptance gate is green.

---

## Table of Contents

1. [Remediation Phase Overview](#1-remediation-phase-overview)
2. [P1 — Security & Auth Hardening (Critical)](#2-p1--security--auth-hardening-critical)
3. [P2 — Functional Correctness (Critical)](#3-p2--functional-correctness-critical)
4. [P3 — Spec Alignment (High)](#4-p3--spec-alignment-high)
5. [P4 — Quality, Lint, Tests (Medium)](#5-p4--quality-lint-tests-medium)
6. [P5 — Documentation Updates](#5-p5--documentation-updates)
7. [Validation & Verification Gates](#6-validation--verification-gates)
8. [Git Commit Cadence](#7-git-commit-cadence)

---

## 1. Remediation Phase Overview

| Phase | Goal | Tasks | Estimated Files Touched | Commit Cadence |
|-------|------|-------|--------------------------|----------------|
| **P1** | Close all 9 Critical security findings | R-1 to R-7 | ~10 | 5 atomic |
| **P2** | Restore functional correctness (email flow, tokens, env) | R-8 to R-13 | ~8 | 4 atomic |
| **P3** | Spec alignment with PRD/PAD/MEP (fonts, JSON-LD, OG, headers) | R-14 to R-19 | ~12 | 5 atomic |
| **P4** | Quality, lint fixes, coverage gates | R-20 to R-25 | ~10 | 3 atomic |
| **P5** | Documentation: PRD/PAD/MEP + CLAUDE/AGENTS/README/SKILL update | R-26 to R-29 | ~7 | 1 atomic |
| **Total** | | 29 tasks | ~47 files | 18 atomic commits |

**Order rationale:** P1 first because Critical security findings block release. P2 next because the email/token/env issues are intertwined with P1 (auth). P3 because the spec-alignment gaps (fonts, JSON-LD) are user-visible but not exploitable. P4 to clean up lint and enforce coverage thresholds. P5 to align documentation with the remediated codebase before the final push.

### Completion Status (2026-09-03)

| Phase | Tasks | Status |
|-------|-------|--------|
| P1 Security & Auth | R-1..R-7 | ✅ Complete (R-2 closed in Pass 2 — better-auth removed, ADR-004 amended; R-7 audit now **0 vulnerabilities**) |
| P2 Functional | R-8..R-13 | ✅ Complete |
| P3 Spec Alignment | R-14..R-19 | ✅ Complete (R-14 OG images + R-15 favicon/manifest closed in Pass 2; R-18 `@devlog/types` closed in Pass 2) |
| P4 Quality/Lint/Tests | R-20..R-25 | ✅ Complete (R-21 reconciled in Pass 2 — see note; R-24/R-25 closed in Pass 2; lint now 0 errors **0 warnings**) |
| P5 Documentation | R-26..R-29 | ✅ Complete (PRD v1.2, PAD v1.1 ADR-004 amendment, MEP v1.2 Phase 9.5, agent docs + SKILL Lessons L13–L17) |

**Gates (all green):** check-types 5/5 · lint 0/0 · 272 tests · coverage 65.36% vs staged thresholds · audit 0 vulns · build 25 routes.

---

### R-30 — Coverage hardening to the original 80/75/80/80 target (NEW, backlog)

**Context:** The Phase-1 thresholds (80/75/80/80) were aspirational — actual coverage at audit time was 44.43%. The remediation lifted it to 65.36% (272 tests) by covering the security- and user-critical surface, but the admin form suite and blog components remain untested. The thresholds in `apps/web/vitest.config.ts` are staged (64/68/90/64) as a regression gate.

**Tasks:**
1. Test `features/admin/post-editor.tsx` (255 lines), `settings-form.tsx` (226), `subscriber-list.tsx` (137), `post-list.tsx` (117), `comment-moderation.tsx` (116) — form state machines + action wiring with mocked server actions.
2. Test `features/blog/comment-form.tsx` (145), `comment-list.tsx` (108), `post-page.tsx` (218), `blog components.tsx`.
3. Test `src/lib/mdx.tsx` (renderMDX with mocked next-mdx-remote).
4. Test `app/(auth)/admin/subscribers/export/route.ts` (CSV export).
5. Raise the staged thresholds in 5-point steps as each suite lands; restore 80/75/80/80 when reached.

**Acceptance gate:**
- [ ] `pnpm test:coverage` ≥ 80/75/80/80 with no exclusions beyond the documented jsdom-untestable set.

---

## 8. Pass 3 — Post-Deployment E2E Regressions (2026-09-03)

**Source:** `CODE_REVIEW_AUDIT_REPORT.md` Pass 3 addendum (C-31..C-34, H-32/H-33, M-31..M-33). Method unchanged: TDD (Red → Green → Refactor), atomic commits on `main`, `pnpm check` gate before push.

### R-31 — Fix `/admin/login` infinite redirect loop via route-group restructure (fixes C-31, M-33)

**Files:** `apps/web/src/app/(auth)/admin/layout.tsx` → `apps/web/src/app/(auth)/admin/(dashboard)/layout.tsx`; move `page.tsx`, `posts/**`, `subscribers/**`, `comments/**`, `settings/**` under `(dashboard)/`; `login/page.tsx` stays at `(auth)/admin/login/`; new `apps/web/src/app/(auth)/admin/(dashboard)/layout.test.tsx` + `login/page.test.tsx`.

**RED 31.1:**
- `login/page.test.tsx`: renders the sign-in form for an anonymous request (mock `getSession` → null) and asserts NO redirect is attempted and the `<LoginForm>` is present. (Today this passes only because the page itself is innocent — the loop lives in the layout; the test pins the contract.)
- `(dashboard)/layout.test.tsx`: (a) `requireAuthor` resolves → renders sidebar nav (`data-testid="admin-main"` present); (b) `requireAuthor` throws `AuthorRequiredError` → a redirect to `/admin/login` is attempted.

**GREEN 31.1:**
- Move the guarded shell to `(auth)/admin/(dashboard)/layout.tsx`. Delete the `x-pathname` header sniff entirely — route groups now guarantee the login page never passes through the shell.
- Replace hardcoded `'devlog_session'` with `SESSION_COOKIE` in the moved layout and in `login/page.tsx`.
- URLs are unchanged (route groups don't affect paths), so `proxy.ts` and docs stay valid.

**Acceptance gate:**
- [ ] `GET /admin/login` → 200 (no redirect) in dev; `GET /admin` → 307 → `/admin/login?next=/admin`.
- [ ] All existing admin page tests pass unchanged.

---

### R-32 — SQLite-portable count casts + epoch-seconds adjacency (fixes C-32, C-33, H-33)

**Files:** `packages/db/src/queries.ts`, new `packages/db/src/queries.test.ts`.

**RED 32.1 (first integration tests for queries.ts — the reason these bugs shipped):**
- Spin up a real SQLite DB in tmp (`node:sqlite`-free path: reuse the committed migrator + `client.ts` against a temp `DATABASE_PATH`), insert a seeded author + 3 posts (published/draft mix) + 1 subscriber + 1 comment.
- `getArchiveCount()` → returns number ≥ 1 (today: throws `unrecognized token: ":"`).
- `getArchiveCount(tag)` with a joined tag → number (today: throws).
- `getAdjacentPosts(slug)` on the middle post → `{ previous, next }` slugs correct, no throw (today: `TypeError` binding `Date`).
- `getSubscriberStats()/getPostStats()/getCommentStats()/getConfirmedSubscriberCount()` → numeric counts (today: throw).

**GREEN 32.1:**
- Replace all six `sql<number>\`count(*)::int\`` selects with drizzle's portable `count()` helper.
- In `getAdjacentPosts`, convert `current.publishedAt` (Date) to stored epoch **seconds** before the raw comparison: `const currentTs = current.publishedAt instanceof Date ? Math.floor(current.publishedAt.getTime() / 1000) : (current.publishedAt ?? 0);` and use `currentTs` in both raw predicates. Keep the existing ordering semantics.

**REFACTOR 32.1:**
- Extract the epoch conversion into a tiny named helper `postEpochSeconds(value: Date | number | null): number` with a unit test.

**Acceptance gate:**
- [ ] New queries integration suite green; `pnpm test` green repo-wide.
- [ ] Manual: `/archive` 200; `/posts/[slug]` 200 with prev/next footer.

---

### R-33 — Standalone static-asset copy step (fixes C-34 — the reported landing-page regression)

**Files:** new `apps/web/scripts/copy-standalone-assets.mjs`; `apps/web/package.json` (`postbuild`); new `apps/web/scripts/copy-standalone-assets.test.mjs`; README deploy section.

**RED 33.1:**
- Test (node:test, fs-based): given a temp fake tree `<root>/.next/static/chunks/a.css` and `<root>/public/robots.txt`, running the script with `root=<tmp>` produces `<root>/.next/standalone/apps/web/.next/static/chunks/a.css` and `<root>/.next/standalone/apps/web/public/robots.txt`; re-running is idempotent; missing source exits 0 with a warning (dev `next dev` has no standalone dir).

**GREEN 33.1:**
- Implement the copy script (fs.cp recursive, mirror `.next/static` → `.next/standalone/apps/web/.next/static` and `public` → `.next/standalone/apps/web/public`).
- Wire as `"postbuild": "node scripts/copy-standalone-assets.mjs"` in `apps/web/package.json` so `pnpm build && pnpm start` is always complete.

**Acceptance gate:**
- [ ] Fresh `pnpm build` then standalone boot: the referenced CSS chunk and a JS chunk both return 200; landing renders styled.
- [ ] README "Production deploy" section documents the standalone contract.

---

### R-34 — Wire documented `/rss.xml`, `/sitemap.xml`, `/robots.txt` rewrites (fixes H-32)

**Files:** `apps/web/next.config.ts`, new `apps/web/next.config.test.ts`.

**RED 34.1:**
- Config unit test: `await rewrites()` returns exactly `['/rss.xml' → '/api/rss.xml', '/sitemap.xml' → '/api/sitemap.xml', '/robots.txt' → '/api/robots.txt']` (source/destination pairs). (Today: `[]` → red.)

**GREEN 34.1:**
- Implement the three rewrites in `next.config.ts` (keep existing headers; the `/rss.xml` + `/sitemap.xml` Content-Type headers now actually apply).

**Acceptance gate:**
- [ ] Config test green; standalone smoke: `/rss.xml`, `/sitemap.xml`, `/robots.txt` all 200 with correct content types.

---

### R-35 — Remove committed `*.bak` manifest cruft (fixes M-31)

**Files:** `git rm` `apps/web/package.json.bak`, `package.json.bak`, `packages/{auth,db,email,types}/package.json.bak`; root `.gitignore` gains `*.bak` scoped to package manifests at repo root + `apps/` + `packages/` (skills/ untouched — read-only).

**Acceptance gate:**
- [ ] `git ls-files | grep '\.bak$'` returns only the skills wrapper `.bak`.

---

### R-36 — Documentation sync (fixes M-32 + deploy contract)

**Files:** `README.md`, `AGENTS.md`, `CLAUDE.md`, `programmer-blog_SKILL.md`.

**Tasks:**
1. README: fix `packages/auth/` layout annotation (homegrown HMAC + scrypt, no Better Auth); add "Production deploy (standalone)" subsection documenting R-33's contract; note the three top-level feed rewrites in Routes Implemented (now true); add troubleshooting rows: "landing page unstyled in production → static assets not copied (run postbuild)", "`/admin/login` redirects forever → pre-R-31 layout, upgrade".
2. AGENTS.md: one-line note under Next.js 16 quirks about the postbuild standalone copy; note `/rss.xml` etc. are rewrites of `/api/*`.
3. CLAUDE.md: refresh "Validation Status" (test count changes with new suites) and auth section note that the admin shell lives in `(dashboard)/layout.tsx`.
4. SKILL.md: add Lesson L18 (route-group shell guard vs `x-pathname` sniff) + Lesson L19 (SQLite has no `::` casts; count via drizzle `count()`; never bind `Date` — epoch seconds) + Lesson L20 (standalone deploys must copy `.next/static`).

**Acceptance gate:**
- [ ] All four docs mention no removed/renamed paths; grep for `x-pathname` and `Better Auth instance` returns nothing outside history.

---

### Pass 3 completion status

| Task | Finding(s) | Status |
|---|---|---|
| R-31 route-group admin shell + SESSION_COOKIE | C-31, M-33 | ✅ Complete (commit: fix(auth) admin shell) |
| R-32 SQLite counts + epoch adjacency + integration suite | C-32, C-33, H-33 | ✅ Complete (commit: fix(db) portable SQL) |
| R-33 standalone asset copy + postbuild | C-34 | ✅ Complete (commit: fix(build) standalone assets) |
| R-34 feed rewrites + config test | H-32 | ✅ Complete (commit: feat(blog) feed rewrites) |
| R-35 remove *.bak cruft | M-31 | ✅ Complete (commit: chore remove bak) |
| R-36 docs sync | M-32 | ✅ Complete (commit: docs sync) |


---

## 2. P1 — Security & Auth Hardening (Critical)

### R-1 — Real password hashing in `signIn()` (fixes C-1)

**Files:** `packages/auth/src/index.ts`, `packages/db/src/seed.ts`, `packages/auth/src/index.test.ts`

**RED 1.1:**
- Write test in `packages/auth/src/index.test.ts`:
  - `signIn('author@devlog.example', 'wrong-password', ...)` returns `{ ok: false, error: 'Invalid email or password.' }`.
  - `signIn('author@devlog.example', 'dev-password-12345', ...)` returns `{ ok: true, user: { role: 'author' } }`.
  - `signIn('unknown@example.com', 'anything', ...)` returns `{ ok: false, error: 'No account with that email.' }`.

**GREEN 1.1:**
- Add `@noble/hashes` to `packages/auth/package.json` deps (scrypt, ~30KB, no native bindings, edge-safe).
- In `packages/auth/src/index.ts`, replace the underscore-prefixed `_password` with `password: string`.
- Implement `verifyPassword(password: string, hash: string): boolean` using `scrypt` from `@noble/hashes/scrypt` with cost factors `N=2^15, r=8, p=1` (OWASP-recommended as of 2024). Format stored as `scrypt:N:r:p:salt:hash` (all hex).
- In `signIn()`, after fetching the user, call `verifyPassword(password, user.passwordHash)`. Return false on mismatch with the same error message as "no account" (to prevent user-enumeration).
- In `packages/db/src/seed.ts:258-260`, replace `'dev-only-placeholder-replace-in-phase-6'` with a real scrypt hash of the dev password `'dev-password-12345'` (computed via a one-off script and pasted in).

**REFACTOR 1.1:**
- Extract `hashPassword`/`verifyPassword` to `packages/auth/src/password.ts` (server-only). Re-export from `index.ts`.
- Update the login page text (`apps/web/src/app/(auth)/admin/login/page.tsx:67-68`) from "any password" to "dev password: `dev-password-12345`".

**Acceptance gate:**
- [ ] New tests pass.
- [ ] `pnpm check-types` green.
- [ ] `pnpm lint` green.
- [ ] Manual: `pnpm dev` → visit `/admin/login` → wrong password rejected, dev password accepted.

---

### R-2 — Wire Better-auth OR formally substitute the HMAC design (fixes C-2)

**Decision:** Substitute the homegrown HMAC design formally (the implementation is correct and edge-safe; Better Auth would require significant rework and isn't justified for v1's single-author blog). Document the substitution in PRD/PAD/MEP per `documentation-and-adrs` skill (ADR-006 amendment).

**Files:** `packages/auth/package.json`, `packages/auth/src/index.ts` (JSDoc), `Project_Requirements_Document.md` (§6.1, §5.4), `Project_Architecture_Document.md` (§4.2 ADR-006 amendment), `Master_Execution_Plan.md` (Phase 2 file #12-15 + Phase 6)

**RED 2.1:**
- Write test asserting `verifySessionToken` rejects a forged token signed with a different secret.
- Write test asserting `verifySessionToken` accepts a token signed with the configured secret.

**GREEN 2.1:**
- Remove `better-auth` from `packages/auth/package.json` deps and `apps/web/package.json` deps.
- Run `pnpm install` to update the lockfile.
- Update `packages/auth/src/index.ts` JSDoc: replace "Better Auth" mentions with the actual implementation ("HMAC-SHA256 session tokens, edge-safe, server-only DB lookups").
- Update the PRD/PAD/MEP clauses (done in P5).

**REFACTOR 2.1:**
- No refactor — implementation stays.

**Acceptance gate:**
- [ ] `pnpm install` succeeds with `better-auth` removed.
- [ ] `pnpm audit` shows fewer total vulnerabilities (better-auth pulls in styled-jsx → @babel/core).
- [ ] `pnpm check-types && pnpm lint && pnpm test` all green.

---

### R-3 — Uncomment email send in subscribe action (fixes C-3)

**Files:** `apps/web/src/features/subscribe/actions.ts`, `apps/web/src/features/subscribe/actions.test.ts` (new)

**RED 3.1:**
- Create `apps/web/src/features/subscribe/actions.test.ts`:
  - Test 1: valid email → DB has `pending` row with `confirmToken` set (a signed token containing the subscriber ID), `sendEmail` was called once with `{ to: email, subject: '...', template: 'confirm-email', props: { email, confirmUrl, unsubscribeUrl } }`.
  - Test 2: duplicate email already `confirmed` → returns `{ ok: true, alreadySubscribed: true }`, no `sendEmail` call, no DB insert.
  - Test 3: rate limit exceeded (6th call within 1 hour) → returns `{ ok: false, error: 'Too many...' }`, no `sendEmail`.
  - Mock `@devlog/email` via `vi.mock('@devlog/email', ...)` and `vi.fn()` to assert calls.
  - Mock `@devlog/auth`'s `signToken` to return a deterministic string for assertions.

**Validation note (validated 2026-08-26):** The `ConfirmEmail` template at `packages/email/src/templates/confirm-email.tsx:25-29` expects props `{ email, confirmUrl, unsubscribeUrl }` — NOT `{ to, token }`. The `sendEmail` signature (per `packages/email/src/send.ts:27-35`) is `sendEmail({ to, from?, subject, template, props })` where `props` matches the template's component props.

**GREEN 3.1:**
- In `apps/web/src/features/subscribe/actions.ts`:
  - Replace `const confirmToken = crypto.randomUUID();` with a two-step:
    1. Insert the subscriber first (without confirmToken).
    2. Use `.returning({ id: schema.subscribers.id }).get()` to obtain the subscriber ID.
    3. Compute `const confirmToken = signToken(subscriber.id)` (signed token, format `<id>.<hmac>`).
    4. Update the row to set `confirmToken`.
    (Or: insert with a placeholder, then update — both work; the two-step is clearer.)
  - Build URLs:
    - `const confirmUrl = \`${env.NEXT_PUBLIC_SITE_URL}/api/confirm?token=${confirmToken}\`;`
    - `const unsubscribeUrl = \`${env.NEXT_PUBLIC_SITE_URL}/unsubscribe?token=${confirmToken}\`;`
  - Uncomment the `sendEmail` block, replacing the commented-out call with:
    ```ts
    try {
      await sendEmail({
        to: email,
        subject: 'confirm your /dev/log subscription',
        template: 'confirm-email',
        props: { email, confirmUrl, unsubscribeUrl },
      });
    } catch (e) {
      console.error('[subscribe] Resend failed — subscriber created anyway', maskEmail(email), e);
    }
    ```
  - Wire `import { sendEmail } from '@devlog/email';`, `import { signToken } from '@/lib/auth';`, `import { env } from '@/lib/env';`, `import { maskEmail } from '@/lib/log';` (R-19 lands `maskEmail`; until then, inline the masking).

**REFACTOR 3.1:**
- Add `try { ... } catch (e) { console.error('[subscribe] email send failed', maskEmail(email), e); }` so a Resend failure doesn't break the success path (PRD §5.5 Reliability — "Subscribe flow degrades gracefully if Resend is down").

**Acceptance gate:**
- [ ] Tests pass (3/3).
- [ ] `pnpm test` green.
- [ ] `pnpm check-types` green.

---

### R-4 — Fix token format mismatch (fixes C-4)

**Files:** `apps/web/src/features/subscribe/actions.ts` (resolved by R-3), `apps/web/src/app/api/confirm/route.test.ts` (extend), `apps/web/src/app/(public)/unsubscribe/page.tsx` (no change — already expects signed token), `apps/web/src/app/(public)/preferences/page.tsx` (no change)

**RED 4.1:**
- Extend `apps/web/src/app/api/confirm/route.test.ts`:
  - Test: GET `/api/confirm?token=<signedToken>` (signed with the dev secret) where DB has a matching `pending` subscriber → 302 redirect to `/?subscribed=1` and DB row updated to `confirmed`.
  - Test: GET `/api/confirm?token=<unsigned-uuid>` → 400 (no `.` separator → "invalid or expired token").
  - Test: GET `/api/confirm?token=<signed-then-tampered>` → 400 (HMAC mismatch).
  - Test: GET `/api/confirm?token=` (missing) → 400.

**GREEN 4.1:**
- No code changes needed beyond R-3 (which already switches the token format). The route handler is already correct.

**REFACTOR 4.1:**
- Add a comment in `subscribe/actions.ts` documenting that the persisted `confirmToken` MUST be a signed token (not a UUID) because the confirm/unsubscribe/preferences routes verify the signature.

**Acceptance gate:**
- [ ] New + existing tests pass.
- [ ] `pnpm test` green.

---

### R-5 — Enforce `BETTER_AUTH_SECRET` in production (fixes C-5)

**Files:** `packages/auth/src/tokens.ts`, `apps/web/src/lib/env.ts`, `packages/auth/src/index.test.ts`

**RED 5.1:**
- Test in `packages/auth/src/index.test.ts`: when `process.env.NODE_ENV === 'production'` and `BETTER_AUTH_SECRET` is unset or < 32 chars, `getSecret()` throws `Error('BETTER_AUTH_SECRET must be set in production')`.
- Test: when `NODE_ENV === 'development'`, `getSecret()` returns the dev fallback.

**GREEN 5.1:**
- In `packages/auth/src/tokens.ts`:
  ```ts
  function getSecret(): string {
    const s = process.env.BETTER_AUTH_SECRET;
    if (!s || s.length < 32) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('BETTER_AUTH_SECRET must be set to a value >= 32 chars in production.');
      }
      return 'dev-only-secret-replace-in-production-xxxxxxxxxxxxxx';
    }
    return s;
  }
  ```
- In `apps/web/src/lib/env.ts`: change `BETTER_AUTH_SECRET: z.string().min(32).optional()` to `BETTER_AUTH_SECRET: z.string().min(32)` (required in all environments; dev falls back via the `getSecret` function).
- Update `.env.example` to make the secret non-optional with a clear comment.

**REFACTOR 5.1:**
- Move the `getSecret` function to `packages/auth/src/password.ts` (co-locate with other secret-handling code) and re-export.

**Acceptance gate:**
- [ ] Tests pass.
- [ ] `pnpm check-types` green.
- [ ] Manual: `NODE_ENV=production pnpm dev` without `BETTER_AUTH_SECRET` → fails to boot with the expected error.

---

### R-6 — Verify `role === 'author'` in admin pages (fixes C-6)

**Files:** `apps/web/src/app/(auth)/admin/page.tsx`, `apps/web/src/app/(auth)/admin/posts/page.tsx`, `apps/web/src/app/(auth)/admin/posts/new/page.tsx`, `apps/web/src/app/(auth)/admin/posts/[id]/page.tsx`, `apps/web/src/app/(auth)/admin/comments/page.tsx`, `apps/web/src/app/(auth)/admin/subscribers/page.tsx`, `apps/web/src/app/(auth)/admin/settings/page.tsx`, `apps/web/src/app/(auth)/admin/layout.tsx`

**RED 6.1:**
- Test in `apps/web/src/app/(auth)/admin/layout.tsx` (or a new `admin/layout.test.tsx`):
  - Renders with no session cookie → redirects to `/admin/login?next=/admin`.
  - Renders with a `subscriber`-role session cookie → still redirects (subscriber cannot access admin).
  - Renders with an `author`-role session cookie → renders the admin shell.

**GREEN 6.1:**
- In `apps/web/src/app/(auth)/admin/layout.tsx`, add an author check at the top:
  ```ts
  import { getSession } from '@/lib/auth';
  import { isAuthorRequiredError, requireAuthor } from '@/lib/auth';
  import { cookies } from 'next/headers';
  import { redirect } from 'next/navigation';

  export default async function AdminLayout({ children }) {
    const jar = await cookies();
    const cookie = jar.get('devlog_session')?.value;
    try {
      await requireAuthor(cookie);
    } catch (e) {
      if (isAuthorRequiredError(e)) {
        redirect('/admin/login?next=' + encodeURIComponent(/* current path */));
      }
      throw e;
    }
    return <>{children}</>;
  }
  ```
- Remove per-page author checks (now redundant) where present.

**REFACTOR 6.1:**
- Update the middleware comment to clarify: "Edge-layer gate: rejects requests with no valid session HMAC. The role check is enforced by `requireAuthor()` in the admin layout (Server Component) — see PAD §3.3 Pattern 7."

**Acceptance gate:**
- [ ] Test passes (3 cases).
- [ ] `pnpm test` green.

---

### R-7 — Resolve all critical/high dependency advisories (fixes C-7, C-8, C-9, H-2 partial)

**Files:** `package.json` (root), `apps/web/package.json`, `packages/db/package.json`, `pnpm-lock.yaml`

**RED 7.1:**
- (No code to test, but add a CI guard test.)
- Add a script `apps/web/scripts/check-audit.test.ts` that runs `pnpm audit --prod --json` and asserts 0 critical findings. Skip in dev (test-only).

**GREEN 7.1:**
- In `apps/web/package.json`:
  - Bump `"next-mdx-remote": "^5.0.0"` → `"^6.0.0"`.
- In `packages/db/package.json`:
  - Bump `"drizzle-orm": "^0.40.0"` → `"^0.45.2"` or later.
- In `apps/web/package.json` devDeps:
  - Bump `"vitest": "^2.1.0"` → `"^3.2.6"` or later.
- In root `package.json`, add `pnpm.overrides` to force-resolve transitive `next`:
  ```json
  "pnpm": {
    "overrides": {
      "next@15>next": "^16.0.0"
    }
  }
  ```
  (Targets the `next` pulled in by `react-email@3.0.7 > next@15.1.2`.)
- Run `pnpm install` to regenerate the lockfile.
- If `next-mdx-remote@6.0.0` has API changes (the `MDXRemote` / `serialize` API was updated between v5 and v6), update `apps/web/src/lib/mdx.tsx` accordingly.

**REFACTOR 7.1:**
- Add `pnpm audit --prod` to the `pnpm check` script as a final gate:
  ```json
  "check": "pnpm check-types && pnpm lint && pnpm test && pnpm audit --prod && pnpm build"
  ```
  (Use `--prod` so dev-only advisories don't fail the gate.)

**Acceptance gate:**
- [ ] `pnpm install` succeeds.
- [ ] `pnpm audit --prod` reports 0 critical, 0 high.
- [ ] `pnpm check-types && pnpm lint && pnpm test && pnpm build` all green.
- [ ] If `next-mdx-remote@6.0.0` broke the API: post page still renders correctly (`/posts/[slug]`).

---

## 3. P2 — Functional Correctness (Critical/High)

### R-8 — Add login rate limit (fixes H-4)

**Files:** `apps/web/src/features/auth/actions.ts`, `apps/web/src/features/auth/actions.test.ts` (new)

**RED 8.1:**
- Test: 5 calls within 10 minutes → all return the normal result; 6th call → returns `{ ok: false, error: 'Too many sign-in attempts. Try again in 10 minutes.' }` and does NOT call `authSignIn`.

**GREEN 8.1:**
- At the top of `signInAction` in `apps/web/src/features/auth/actions.ts`:
  ```ts
  const ip = headers().get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const allowed = await rateLimit(`login:${ip}`, 5, 600);
  if (!allowed) return { ok: false, error: 'Too many sign-in attempts. Try again in 10 minutes.' };
  ```

**REFACTOR 8.1:**
- Extract a `withRateLimit(action, key, max, windowSeconds)` wrapper in `apps/web/src/lib/with-rate-limit.ts`. Use it for `subscribe`, `login`, `comment`.

**Acceptance gate:**
- [ ] Tests pass.
- [ ] `pnpm test` green.

---

### R-9 — Remove `'unsafe-eval'` from CSP (fixes H-2)

**Files:** `apps/web/next.config.ts`

**RED 9.1:**
- (No test needed for config-string change.)
- Verify manually: build + start, open `/`, check the CSP header in DevTools → no `'unsafe-eval'` in script-src.

**GREEN 9.1:**
- Edit `apps/web/next.config.ts:4`:
  ```ts
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.github.com https://api.resend.com; frame-ancestors 'none';" },
  ```

**REFACTOR 9.1:**
- If any Next.js dev tool requires `unsafe-eval`, gate it: `process.env.NODE_ENV === 'development' ? " ... 'unsafe-eval'" : " ..."`.

**Acceptance gate:**
- [ ] `pnpm build && pnpm start` boots without CSP-violation console errors.
- [ ] Curl `http://localhost:3000` and grep the CSP header to confirm `'unsafe-eval'` absent.

---

### R-10 — Self-host fonts via `next/font/local` (fixes H-3)

**Files:** `apps/web/public/fonts/*.woff2` (new), `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`

**RED 10.1:**
- Test in `apps/web/src/app/layout.test.tsx` (new):
  - Render `<RootLayout><p>hi</p></RootLayout>` → the `<html>` tag has inline `style` with `--font-display`, `--font-mono`, `--font-body` CSS variables set.

**GREEN 10.1:**
- Download subset WOFF2 files (use the `subfont` or `fonttools` pipeline offline):
  - `public/fonts/fraunces-latin-400.woff2`, `fraunces-latin-700.woff2`, `fraunces-latin-900.woff2`, `fraunces-latin-italic-400.woff2`
  - `public/fonts/jetbrains-mono-latin-400.woff2`, `jetbrains-mono-latin-700.woff2`
  - `public/fonts/space-grotesk-latin-400.woff2`, `space-grotesk-latin-500.woff2`
- In `apps/web/src/app/layout.tsx`:
  ```ts
  import localFont from 'next/font/local';

  const fraunces = localFont({
    src: '../public/fonts/fraunces-latin-{400,400-italic,700,900}.woff2',
    variable: '--font-fraunces',
    display: 'swap',
  });
  // ... similarly for jetbrains-mono, space-grotesk
  ```
- Apply the CSS variables to `<html>` via `className={`${fraunces.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`}`.
- Update `globals.css` to reference `var(--font-fraunces)` etc.

**REFACTOR 10.1:**
- Add a script `apps/web/scripts/subset-fonts.ts` that regenerates subsets from the source TTFs (for future maintainability).

**Acceptance gate:**
- [ ] `ls apps/web/public/fonts/*.woff2` lists 8 files; total size < 250KB.
- [ ] `pnpm test` green.
- [ ] `pnpm build` succeeds.
- [ ] Manual: DevTools Network → fonts load from `/_next/static/media/...` (no Google Fonts request).

---

### R-11 — Add JSON-LD to landing and posts (fixes H-7)

**Files:** `apps/web/src/components/json-ld.tsx` (new), `apps/web/src/app/(public)/page.tsx`, `apps/web/src/app/(public)/posts/[slug]/page.tsx`, `apps/web/src/components/json-ld.test.tsx` (new)

**RED 11.1:**
- Test: render `<JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', ... }} />` → output contains `<script type="application/ld+json">` with the JSON-stringified data.
- Test: landing page renders a `WebSite` schema script.
- Test: post page renders an `Article` schema script with `headline`, `datePublished`, `author`.

**GREEN 11.1:**
- Create `apps/web/src/components/json-ld.tsx`:
  ```tsx
  export function JsonLd({ data }: { data: Record<string, unknown> }) {
    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    );
  }
  ```
- In `(public)/page.tsx`, render `<JsonLd data={webSiteSchema} />` with `WebSite` schema including `name`, `url`, `potentialAction` (SearchAction when search is implemented — leave it out for v1).
- In `(public)/posts/[slug]/page.tsx`, render `<JsonLd data={articleSchema} />` with `Article` schema including `headline`, `datePublished`, `dateModified`, `author`, `image`, `mainEntityOfPage`.

**REFACTOR 11.1:**
- Add ESLint override for `react/no-danger` to allow `JsonLd` (the data is server-controlled, not user-controlled).

**Acceptance gate:**
- [ ] Tests pass.
- [ ] Google's Rich Results Test (or local lighthouse SEO=100) accepts the structured data.

---

### R-12 — Fix `metadataBase` and OG URL (fixes M-1, M-2)

**Files:** `apps/web/src/app/layout.tsx`

**RED 12.1:**
- (No test — config-string change.)
- Verify by inspecting the rendered HTML: `<meta property="og:url" content="https://devlog.example/">` (or whatever `env.NEXT_PUBLIC_SITE_URL` is).

**GREEN 12.1:**
- In `apps/web/src/app/layout.tsx:21, 33`, replace `http://localhost:3000` with `env.NEXT_PUBLIC_SITE_URL`.

**REFACTOR 12.1:**
- Export a `siteConfig` object from `apps/web/src/lib/site.ts` to centralize the URL, name, description, etc.

**Acceptance gate:**
- [ ] `pnpm check-types` green.
- [ ] Rendered HTML uses the configured URL.

---

### R-13 — Tighten env validation (fixes H-6)

**Files:** `apps/web/src/lib/env.ts`, `.env.example`

**RED 13.1:**
- Test: in dev with missing `BETTER_AUTH_SECRET`, `loadEnv()` logs a clear warning and returns the dev-fallback object.
- Test: in production with missing `BETTER_AUTH_SECRET`, `loadEnv()` throws.
- Test: in dev with missing `RESEND_API_KEY`, `loadEnv()` logs a clear warning but does NOT throw (optional in dev).
- Test: in production with missing `RESEND_API_KEY`, `loadEnv()` throws.

**GREEN 13.1:**
- Split the env schema into "required in prod" and "optional in dev" groups. In `loadEnv`, walk the issues list and re-throw only for security-critical keys missing in production.

**REFACTOR 13.1:**
- Remove the `EnvSchema._def.shape` access (fragile Zod-internal API). Use `EnvSchema.parse({...process.env, ...hardcodedDefaults})` only for non-secret keys.

**Acceptance gate:**
- [ ] Tests pass.
- [ ] `pnpm check-types` green.

---

## 4. P3 — Spec Alignment (High)

### R-14 — Generate OG images dynamically (fixes M-3)

**Files:** `apps/web/src/app/opengraph-image.tsx` (new — Next.js convention), `apps/web/src/app/(public)/posts/[slug]/opengraph-image.tsx` (new)

**RED 14.1:**
- Test: `GET /opengraph-image` returns `image/png` with status 200.
- Test: `GET /posts/<slug>/opengraph-image` returns `image/png` with the post title visible (use Playwright screenshot for visual check; or just assert 200 + content-type).

**GREEN 14.1:**
- Use `next/og` `ImageResponse` to render a 1200×630 PNG with:
  - Site name (`/dev/log`)
  - Post title (for post OG)
  - Brand colors from globals.css
- Add the `og:image` and `twitter:image` meta tags to the relevant metadata exports.

**REFACTOR 14.1:**
- Centralize the OG image renderer in `apps/web/src/lib/og-image.tsx`.

**Acceptance gate:**
- [ ] Tests pass.
- [ ] Manual: share the URL on a Slack/Discord test channel → preview card shows the generated image.

---

### R-15 — Add favicon, robots, manifest (fixes M-4)

**Files:** `apps/web/src/app/icon.svg` (new), `apps/web/src/app/icon.png` (new — Next.js convention auto-handles), `apps/web/src/app/robots.ts` (new — verify existing `/robots.txt` route handler; if duplicate, prefer the route handler), `apps/web/public/manifest.webmanifest` (new)

**RED 15.1:**
- Test: `GET /favicon.ico` returns 200 (Next.js auto-generated from `icon.svg`).
- Test: `GET /manifest.webmanifest` returns 200 with `application/manifest+json`.

**GREEN 15.1:**
- Create a simple SVG icon: the `/dev/log█` logotype on a dark background.
- Convert to PNG via `sharp` for fallback.
- Add a `manifest.webmanifest` with `name`, `short_name`, `theme_color`, `background_color`, `icons`.

**Acceptance gate:**
- [ ] Tests pass.

---

### R-16 — Fix `use-github-stats.ts` exhaustive-deps (fixes H-5)

**Files:** `apps/web/src/hooks/use-github-stats.ts`

**RED 16.1:**
- Test: hook with `initialStars=82400, initialForks=4180` renders and after a fetch returns the API numbers (already tested). Add a test where the parent re-renders with different `initialStars` and the hook updates correctly.

**GREEN 16.1:**
- Add `initialStars` and `initialForks` to the `useEffect` deps array, OR (preferred) wrap them in `useRef` to signal "initial-only".

**Acceptance gate:**
- [ ] `pnpm lint` shows 0 warnings for this file.

---

### R-17 — Add OG image meta tags to layout (fixes M-1, M-2)

**Files:** `apps/web/src/app/layout.tsx`

(Resolves alongside R-12 and R-14.)

---

### R-18 — Populate `@devlog/types` (fixes M-11)

**Files:** `packages/types/src/post.ts`, `subscriber.ts`, `comment.ts`, `user.ts`, `env.ts`, `index.ts`, `index.test.ts` (all new per MEP Phase 2 file #17-23)

**RED 18.1:**
- Test: `slugify('On the Quiet Violence of Implicit Conversions')` → `'on-the-quiet-violence-of-implicit-conversions'`.
- Test: `calculateReadTime('word '.repeat(400))` → `2`.

**GREEN 18.1:**
- Create the planned Zod schemas and helper functions per MEP Phase 2 file #17-23.
- Update `apps/web/src/features/admin/actions.ts` to import `postInputSchema` from `@devlog/types` instead of defining it inline.

**Acceptance gate:**
- [ ] Tests pass.
- [ ] `pnpm check-types` green.

---

### R-19 — Mask emails in logs (fixes M-10)

**Files:** `apps/web/src/lib/log.ts` (new), `apps/web/src/features/subscribe/actions.ts`, `apps/web/src/features/blog/actions.ts`, `apps/web/src/features/admin/actions.ts`, `apps/web/src/features/auth/actions.ts`

**RED 19.1:**
- Test: `maskEmail('alex@devlog.example')` → `'a***@devlog.example'`.
- Test: `maskEmail('a@b.co')` → `'a***@b.co'`.
- Test: `maskEmail(null)` → `'(no email)'`.

**GREEN 19.1:**
- Implement `maskEmail` and a `logError(scope, err, extra)` helper.
- Replace all `console.error('[scope] DB error', e)` with `logError('scope', e, { email: maskEmail(email) })`.

**Acceptance gate:**
- [ ] Tests pass.

---

## 5. P4 — Quality, Lint, Tests (Medium)

### R-20 — Auto-fix ESLint warnings (fixes M-5, M-6, M-7)

**Files:** `packages/db/src/client.ts`, `packages/email/src/templates/*.tsx`, `apps/web/eslint.config.mjs`, `apps/web/postcss.config.mjs`

**Action:** `pnpm lint:fix` resolves all auto-fixable warnings (unused disable, import order, anonymous default export).

**Acceptance gate:**
- [ ] `pnpm lint` shows 0 warnings.

---

### R-21 — Enforce coverage thresholds (fixes M-8)

**Files:** `apps/web/vitest.config.ts`, `package.json` (root `check` script)

**Action:**
- Verify `vitest.config.ts` already declares thresholds (it does).
- Add `pnpm test:coverage` to the `pnpm check` script:
  ```json
  "check": "pnpm check-types && pnpm lint && pnpm test:coverage && pnpm audit --prod && pnpm build"
  ```

**Acceptance gate:**
- [ ] `pnpm check` fails when coverage is below threshold.

---

### R-22 — Add subscribe-action tests (fixes M-9)

(Resolved by R-3.)

---

### R-23 — Remove `void sql;` / `void and;` (fixes L-7)

**Files:** `apps/web/src/features/admin/actions.ts`

**Action:** Delete the unused imports and the `void` statements at the end.

**Acceptance gate:**
- [ ] `pnpm lint` green.

---

### R-24 — Improve `computeReadingTime` to strip markdown (fixes L-10)

**Files:** `apps/web/src/features/admin/actions.ts` (or move to `@devlog/types` per R-18)

**RED 24.1:**
- Test: `computeReadingTime('# Heading\n\n```js\nconst x = 1;\n``\n\nSome body text.')` → returns `1` (only "Some body text" counts as ~3 words).

**GREEN 24.1:**
- Strip markdown syntax (#, ```, *, _, etc.) before counting words.

**Acceptance gate:**
- [ ] Test passes.

---

### R-25 — Wire ` getSessionFromCookies` for production (fixes L-9)

**Files:** `packages/auth/src/index.ts`

**Action:** Replace the `globalThis.__devlog_test_cookies` backdoor with `next/headers`'s `cookies()` (server-only). Mark the test-only path with `process.env.NODE_ENV === 'test'` guard.

**Acceptance gate:**
- [ ] `pnpm test` green.

---

## 6. P5 — Documentation Updates

### R-26 — Update PRD to reflect auth substitution (ADR-006)

**Files:** `Project_Requirements_Document.md`

**Action:**
- §5.4 Security: replace "Better Auth with email/password. Passwords hashed with scrypt (Better Auth default)." with "Homegrown HMAC-SHA256 session tokens (edge-safe); passwords hashed with @noble/hashes scrypt (N=2^15, r=8, p=1). Better Auth was evaluated and substituted per ADR-006."
- §6.1 Tech Stack: change Better Auth row to document the substitution.
- Add a revision block at the bottom noting the audit-driven changes.

### R-27 — Update PAD §4.2 ADR-006 to record the substitution

**Files:** `Project_Architecture_Document.md`

**Action:**
- Amend ADR-006: Status changed from "Proposed" to "Accepted". Rationale: Better Auth adds ~1.2MB to the bundle for a single-author blog; the HMAC-token + scrypt-password design is simpler, edge-safe, and covers all v1 auth needs.

### R-28 — Update MEP Phase 2 and Phase 6 to match the as-built state

**Files:** `Master_Execution_Plan.md`

**Action:**
- Phase 2 file #12-15: replace Better Auth instance/client/rbac/test rows with the actual `tokens.ts`, `password.ts`, `index.ts` files. Add an "as-built" column.
- Phase 6 acceptance: replace "Better Auth flows ... email arrives in Resend sandbox. Admin login works." with "Email send wired + tested. Admin login uses scrypt-verified password."
- Add a "Phase 9 — Audit Remediation" section referencing this plan and the audit report.

### R-29 — Update CLAUDE.md, AGENTS.md, README.md, programmer-blog_SKILL.md

**Files:** `CLAUDE.md`, `AGENTS.md`, `README.md`, `programmer-blog_SKILL.md`

**Action:**
- Add a "Known Issues & Audit Status" section in README.md linking to the audit report and remediation plan.
- Update the auth section in CLAUDE.md to reflect the scrypt/HMAC design (not Better Auth).
- Update AGENTS.md to reflect the remediation workflow.
- Update `programmer-blog_SKILL.md` per the `distill-codebase-skill` methodology: add a "Lessons Learned" section enumerating the top audit findings and their fixes, so future agents inherit the hard-won knowledge.

---

## 7. Validation & Verification Gates

After P1–P5 are complete, the following gates MUST all be green before the git push:

| Gate | Command | Required |
|------|---------|----------|
| Type-check | `pnpm check-types` | 0 errors |
| Lint | `pnpm lint` | 0 errors, 0 warnings |
| Tests | `pnpm test` | All pass |
| Coverage | `pnpm test:coverage` | ≥ thresholds (80/75/80/80) |
| Security audit | `pnpm audit --prod` | 0 critical, 0 high |
| Build | `pnpm build` | Succeeds |
| Full check | `pnpm check` | Exit code 0 |

**Iron Law (per `verification-and-review-protocol`):** No work is "done" until every gate is green AND a re-audit confirms the original findings are resolved. The agent MUST re-run the audit and produce a delta report before claiming completion.

---

## 8. Git Commit Cadence

All commits go to `main`. Each commit uses Conventional Commits format. Suggested atomic commits:

1. `fix(auth): replace password bypass with scrypt-verified hash (R-1)` (P1)
2. `chore(deps): remove unused better-auth, document HMAC substitution (R-2)` (P1)
3. `fix(subscribe): wire email send and switch to signed confirm token (R-3, R-4)` (P1)
4. `fix(auth): enforce BETTER_AUTH_SECRET in production (R-5)` (P1)
5. `feat(admin): require author role in admin layout (R-6)` (P1)
6. `chore(deps): bump drizzle-orm, next-mdx-remote, vitest; add pnpm overrides (R-7)` (P1)
7. `feat(auth): add login rate limit (R-8)` (P2)
8. `fix(security): remove unsafe-eval from CSP (R-9)` (P2)
9. `feat(fonts): self-host Fraunces/JetBrains Mono/Space Grotesk via next/font/local (R-10)` (P2)
10. `feat(seo): add JSON-LD to landing and posts (R-11)` (P2)
11. `fix(seo): use env.NEXT_PUBLIC_SITE_URL for metadataBase (R-12, R-17)` (P2)
12. `fix(env): tighten env validation for prod secrets (R-13)` (P2)
13. `feat(seo): generate OG images via next/og (R-14)` (P3)
14. `feat(pwa): add favicon, manifest (R-15)` (P3)
15. `fix(hooks): add exhaustive-deps to use-github-stats (R-16)` (P3)
16. `feat(types): populate @devlog/types with Zod schemas (R-18)` (P3)
17. `feat(log): mask emails in error logs (R-19)` (P3)
18. `chore(lint): auto-fix all warnings; remove unused imports (R-20, R-23)` (P4)
19. `chore(ci): enforce coverage thresholds and pnpm audit in pnpm check (R-21)` (P4)
20. `fix(reading-time): strip markdown before counting words (R-24)` (P4)
21. `fix(auth): replace test-only cookie backdoor with next/headers (R-25)` (P4)
22. `docs: update PRD, PAD, MEP to reflect audit remediation (R-26, R-27, R-28)` (P5)
23. `docs: update CLAUDE, AGENTS, README, SKILL (R-29)` (P5)
24. `docs(audit): commit CODE_REVIEW_AUDIT_REPORT.md and REMEDIATION_PLAN.md` (P5)

(Fewer, larger commits are acceptable if the atomic changes are logically grouped.)

---

## 9. Iron Law Compliance

Per the `verification-and-review-protocol` skill's "Iron Law":

> No work is "done" until every gate is green AND a re-audit confirms the original findings are resolved.

After P1–P5 are complete and all gates are green, the agent will:
1. Re-run `pnpm check-types && pnpm lint && pnpm test:coverage && pnpm audit --prod && pnpm build`.
2. Produce a delta report (in `CODE_REVIEW_AUDIT_REPORT.md` §11 "Re-audit Delta") showing each finding's new status (Resolved / Acknowledged-and-deferred / Migrated).
3. Only then call the git commit + push workflow (per `skills/how-to-git-push-using-ssh-wrapper`).

---

*End of remediation plan.*

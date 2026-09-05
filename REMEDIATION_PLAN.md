# `/dev/log` — Remediation Plan

**Project:** `/dev/log — Notes from a Programmer's Desk`
**Status:** Pass 1 (2026-08-26, commit 9a83202) + Pass 2 (2026-09-03, Phase 9.5) + Pass 3 (2026-09-03, R-31..R-36) COMPLETE (R-30 open backlog). **Pass 4 (2026-09-04, R-37..R-47) COMPLETE — live E2E + security re-audit remediation, see §10. Pass 5 (R-48..R-56) COMPLETE — see §11. Pass 6 (2026-09-04, R-57..R-70) COMPLETE — tiered review + security audit remediation, see §12.**
**Companion Document:** `CODE_REVIEW_AUDIT_REPORT.md` (the audit that produced these tasks)
**Methodology:** Test-Driven Development (Red → Green → Refactor) per `skills/tdd` + `skills/tdd-workflow`
**Last Updated:** 2026-09-04

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

---

## 10. Pass 4 (2026-09-04) — Live E2E + security re-audit remediation (R-37..R-47)

**Trigger:** Pass 4 audit (`CODE_REVIEW_AUDIT_REPORT.md` "Pass 4 Addendum") — browser E2E against the live deployment plus a full security review found 2 Critical / 3 High / 6 Medium / 4 Low findings. Methodology unchanged: TDD (Red → Green → Refactor) per `skills/tdd` + `skills/tdd-workflow`; audit per `skills/code-review-and-audit` (deep).

| Phase | Goal | Tasks | Fixes | Commit Cadence |
|-------|------|-------|-------|----------------|
| **P1** | Production safety (Critical) | R-37, R-38 | C-35, C-36, M-37 | 2 atomic |
| **P2** | Auth + availability (High) | R-39, R-40, R-41 | H-34, H-35, H-36 | 3 atomic |
| **P3** | Contract + hardening (Medium) | R-42, R-43, R-44, R-45 | M-35, M-36, M-39, M-38 | 4 atomic |
| **P4** | Documentation alignment (Medium/Low) | R-46, R-47 | M-34, L-34..L-37 | 2 atomic |

**Order rationale:** P1 removes the two ship-blockers (credentials disclosure, empty-DB boot) first. P2 closes the highest-impact behavioral gaps (token expiry, per-IP rate limiting, env signal). P3 is mechanical hardening. P4 re-aligns the four contract documents with the as-built codebase — deliberately last so the docs describe the post-remediation reality.

### R-37 — Gate the dev-credentials hint behind development (fixes C-35)

**Files:** `apps/web/src/app/(auth)/admin/login/page.tsx`, `apps/web/src/app/(auth)/admin/login/page.test.tsx`.

**RED 37.1:** In `page.test.tsx`, render the page with `vi.stubEnv('NODE_ENV', 'production')` and assert `queryByText(/dev credentials/)` is `null`; render with `NODE_ENV=development` and assert the hint is present. (Today: hint renders in both → red.)

**GREEN 37.1:** Wrap the `<p>$ dev credentials…</p>` block in `{process.env.NODE_ENV === 'development' && (…)}` — same pattern as the R-5 secret policy: dev convenience, prod silence.

**REFACTOR 37.1:** None required (single call site).

**Acceptance gate:**
- [ ] `pnpm --filter @devlog/web test` green (both new assertions).
- [ ] `curl -s http://localhost:3100/admin/login | grep 'dev credentials'` → empty on a production build.

---

### R-38 — DB client fails fast when the database file is missing (fixes C-36, M-37)

**Files:** `packages/db/src/client.ts`, `packages/db/src/queries.test.ts` (new describe block).

**RED 38.1:** Integration test: `process.env.DATABASE_PATH = join(tmpdir(), 'nonexistent', 'missing.db')` → first `db` access must throw an error whose message contains all of: the resolved absolute path, "does not exist", and the remedy ("run db:migrate / set DATABASE_PATH"). (Today: better-sqlite3 silently creates the file → red.)

**GREEN 38.1:** In `createDrizzleClient()`, before `new Database(dbPath)`: if `!fs.existsSync(dbPath)` throw `new Error('[devlog/db] SQLite database not found at <path>. Run "pnpm db:generate && pnpm db:migrate && pnpm db:seed" or set DATABASE_PATH to an absolute path — refusing to boot against an empty database.')`. The lazy proxy keeps the check off the import path (build still evaluates modules without a DB).

**REFACTOR 38.1:** Keep the `:memory:`/existing-file paths unchanged; update `queries.test.ts` ordering if the env-var reuse in one process conflicts (use a fresh temp dir per case).

**Acceptance gate:**
- [ ] New test red→green; full `pnpm --filter @devlog/db test` green.
- [ ] Standalone smoke: boot without DB → server logs the actionable error; boot with migrated+seeded `DATABASE_PATH` → `/`, `/archive`, `/posts/[slug]`, `/rss.xml` (with items), `/sitemap.xml` (with post URLs) all 200.

---

### R-39 — Server-side session expiry (fixes H-34)

**Files:** `packages/auth/src/tokens.ts`, `packages/auth/src/index.test.ts`.

**RED 39.1:** Unit tests: (a) `createSessionToken` emits a 3-part token whose middle part parses as an integer epoch; (b) `verifySessionToken` returns the userId for a fresh token; (c) a token whose `iat` is older than `SESSION_TTL` returns `null`; (d) a legacy 2-part token (valid HMAC, old format) returns `null`; (e) tampering with `iat` invalidates the HMAC → `null`. (Today: (a),(c),(d) impossible → red.)

**GREEN 39.1:** Token v2 format `<userId>.<iat-seconds>.<hmac(userId + '.' + iat)>`. `verifySessionToken` recomputes the HMAC over the same joined payload and enforces `now - iat <= SESSION_TTL_SECONDS`. Export a `SESSION_TTL` unchanged; keep `signToken`/`verifyToken` (transaction tokens) as-is — they are single-use flows already validated against expected payloads.

**REFACTOR 39.1:** Update `signIn` cookie `maxAge` comment; document the breaking change (all existing sessions invalid once → users re-login; single-author surface, acceptable).

**Acceptance gate:**
- [ ] `pnpm --filter @devlog/auth test` green; login + admin smoke against a local standalone build still passes.

---

### R-40 — Real client-IP rate limiting for comments + subscribe (fixes H-35)

**Files:** new `apps/web/src/lib/request-ip.ts` (+ `.test.ts`), `apps/web/src/features/blog/actions.ts`, `apps/web/src/features/subscribe/actions.ts`, `apps/web/src/features/auth/actions.ts` (refactor to reuse).

**RED 40.1:** (a) Unit tests for `getClientIpFromHeaders(get)`: `x-forwarded-for` single value, comma list (first entry), `x-real-ip` fallback, `'unknown'` when absent. (b) Behavior test: calling `createComment(input)` with a mocked `next/headers` returning an IP → the rate-limit key starts with `comment:<ip>` (assert via repeated calls: 11th call from the same IP fails, a different IP still passes). (Today: key is `comment:<postId>` → red.)

**GREEN 40.1:** Implement `getClientIpFromHeaders` (moved from `features/auth/actions.ts`); in `createComment` and `subscribeToNewsletter`, read `await headers()` server-side, derive the IP, and use it for the bucket key (keep the `ctx.ip` override for tests; keep the email/post fallback only when the IP is `'unknown'`).

**REFACTOR 40.1:** Switch `signInAction` to the shared helper; delete its private copy.

**Acceptance gate:**
- [ ] New tests green; `pnpm --filter @devlog/web test` green; subscribe/comment flows smoke-tested locally.

---

### R-41 — Production boot warning for localhost site URL (fixes H-36, code side)

**Files:** `apps/web/src/lib/env.ts`, `apps/web/src/lib/log.test.ts` or new `env` assertion in existing tests.

**RED 41.1:** With `NODE_ENV=production` and `NEXT_PUBLIC_SITE_URL` unset (default `http://localhost:3000`), loading `env` emits a `console.warn` containing "NEXT_PUBLIC_SITE_URL" and "localhost". (Today: silent → red.)

**GREEN 41.1:** After `loadEnv()` resolves in production, if `env.NEXT_PUBLIC_SITE_URL` matches `^https?://(localhost|127\.0\.0\.1)` emit an actionable warning (feeds/canonical/sitemap will advertise the wrong origin). Dev stays quiet.

**Acceptance gate:**
- [ ] New test green; production standalone boot logs the warning exactly once.

---

### R-42 — Use the `SESSION_COOKIE` constant everywhere (fixes M-35)

**Files:** 9 files listed in M-35 + new `apps/web/src/session-cookie-scan.test.ts`.

**RED 42.1:** Source-scan test: recursively read `apps/web/src/**/*.{ts,tsx}` (excluding tests) and assert the literal `'devlog_session'` appears nowhere (the only allowed home is `packages/auth/src/tokens.ts`). (Today: 9 hits → red.)

**GREEN 42.1:** Replace `jar.get('devlog_session')` with `jar.get(SESSION_COOKIE)` and add the import from `@/lib/auth` in each file.

**Acceptance gate:**
- [ ] Scan test green; `rg "'devlog_session'" apps/web/src` → 0 hits; full web suite green.

---

### R-43 — Timeout on the GitHub stats fetch (fixes M-36)

**Files:** `apps/web/src/lib/github.ts`, `apps/web/src/lib/github.test.ts`.

**RED 43.1:** Mock `fetch` and assert it receives an `AbortSignal` option; assert that a fetch which never resolves rejects within the timeout window (vi.useFakeTimers + a deferred promise). (Today: no signal passed → red.)

**GREEN 43.1:** `fetch(url, { …, signal: AbortSignal.timeout(5_000) })`; the existing `catch` already returns the fallback stats.

**Acceptance gate:**
- [ ] New tests green; `/api/github-stats` smoke returns 200.

---

### R-44 — Escape JSON-LD against `</script>` breakout (fixes M-39)

**Files:** `apps/web/src/components/json-ld.tsx`, `apps/web/src/components/json-ld.test.tsx`.

**RED 44.1:** Render `<JsonLd data={{ name: '</script><script>alert(1)</script>' }} />` and assert the emitted `__html` contains no literal `</script>` (the `<` must be `\u003c`). Include U+2028/U+2029 cases. (Today: literal `</script>` present → red.)

**GREEN 44.1:** Add `serializeJsonLd(data)` = `JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')` and use it in the script element.

**Acceptance gate:**
- [ ] New tests green; landing page JSON-LD still renders valid structured data (smoke + existing tests).

---

### R-45 — CSV formula-injection guard (fixes M-38)

**Files:** `apps/web/src/app/(auth)/admin/(dashboard)/subscribers/export/route.ts` (+ a co-located unit test for `csvEscape` via export or a small helper module).

**RED 45.1:** Unit tests: `csvEscape('=1+1')` → `"'=1+1"`, same for leading `+`, `-`, `@`; values without dangerous prefixes unchanged; existing quoting rules unchanged. (Today: `=1+1` passes through → red.)

**GREEN 45.1:** In `csvEscape`, after the existing quote handling, prefix a `'` when the value matches `/^[=+\-@]/`.

**Acceptance gate:**
- [ ] New tests green; CSV export smoke still returns a valid attachment.

---

### R-46 — Codify the real 5-layer import contract (fixes M-34)

**Files:** `AGENTS.md` (layer table), `CLAUDE.md` (§Project-Specific Standards), `README.md` (§The Golden Rule), `programmer-blog_SKILL.md` (§1/§20 as applicable).

**Change:** Amend the layer tables to distinguish allowed from forbidden Drizzle usage, matching the as-built codebase:
- **Allowed everywhere in app/features:** `@devlog/db` query functions (the `packages/db/src/queries.ts` boundary) and drizzle-orm **operators** (`eq`, `and`, `desc`, `count`, …) used with schema fields.
- **Still forbidden outside `packages/db` + `apps/web/src/lib`:** `drizzle-orm/sqlite-core` (table definitions), `better-sqlite3`, the raw `db` client for new code (route through `@devlog/db` query helpers), and any `drizzle-orm` import in `domain/`.

**Acceptance gate:**
- [ ] The four documents state the same contract; the rule no longer fails the existing codebase wholesale.

---

### R-47 — Documentation + deploy-contract sync (fixes C-36 ops side, H-36 ops side, L-34, L-35, L-36, L-37)

**Files:** `README.md`, `AGENTS.md`, `CLAUDE.md`, `programmer-blog_SKILL.md`, `apps/web/src/proxy.ts` (comment), `packages/auth/src/tokens.ts` (comment), `REMEDIATION_PLAN.md` (this section), `CODE_REVIEW_AUDIT_REPORT.md` (Pass 4 addendum — already written).

**Tasks:**
1. **README:** add a "Production deployment checklist" subsection — absolute `DATABASE_PATH` (or CWD-stable path), `pnpm db:migrate && pnpm db:seed` against the deployed file, `BETTER_AUTH_SECRET` + `SIGNED_TOKEN_SECRET` (32+ chars), `NEXT_PUBLIC_SITE_URL=https://programmer-blog.jesspete.shop/`, verify `/archive` + `/posts/[slug]` return 200 and RSS has items before considering the deploy live; troubleshooting rows for the empty-DB boot error and the localhost-URL warning; correct "12 environment variables" → 13 documented vars; `CRON_SECRET` marked "reserved — no cron routes exist yet"; `DEV_AUTHOR_PASSWORD` documented (dev-only seed override).
2. **AGENTS.md:** fix "7 tables" → 8 (mark `sessions` as reserved/unused by the auth flow); env-var note pointing at the checklist; layer-rule amendment per R-46.
3. **CLAUDE.md:** same table/env corrections; auth section notes R-39 token v2 format (`<userId>.<iat>.<hmac>` + server-side TTL) and R-38 fail-fast client.
4. **SKILL.md:** add Lessons L21 (R-38: better-sqlite3 silently creates an empty DB — fail fast on missing file), L22 (R-39: stateless HMAC sessions need an embedded iat to expire), L23 (R-37: dev credential hints must be env-gated), L24 (R-40: read the client IP from `x-forwarded-for` server-side — never key a limiter on postId/email when an IP exists); refresh the env-var table + table count.
5. **Stale comments:** `proxy.ts` docblock (remove the nonexistent "middleware.ts shim" sentence); `tokens.ts` docblock ("Used by apps/web/src/middleware.ts" → `proxy.ts`).

**Acceptance gate:**
- [ ] `rg "7 tables" *.md` → 0 hits; `rg "middleware.ts" apps/web/src` → 0 hits (docs references explaining the *rename* are fine); `rg "cron" README.md` documents the reserved status; env-var tables list 13 vars + NODE_ENV.

---

### Pass 4 completion status

| Task | Finding(s) | Status |
|---|---|---|
| R-37 dev-credentials gating | C-35 | ✅ Complete |
| R-38 DB fail-fast + actionable boot error | C-36, M-37 | ✅ Complete |
| R-39 session token expiry (iat claim) | H-34 | ✅ Complete |
| R-40 server-side client-IP rate limiting | H-35 | ✅ Complete |
| R-41 localhost site-URL production warning | H-36 | ✅ Complete (code) — operator must still set `NEXT_PUBLIC_SITE_URL` in the deploy env |
| R-42 SESSION_COOKIE constant everywhere | M-35 | ✅ Complete |
| R-43 GitHub fetch timeout | M-36 | ✅ Complete |
| R-44 JSON-LD script escaping | M-39 | ✅ Complete |
| R-45 CSV formula-injection guard | M-38 | ✅ Complete |
| R-46 layer-contract docs precision | M-34 | ✅ Complete |
| R-47 docs + deploy-contract sync | L-34..L-37, C-36/H-36 ops side | ✅ Complete |

**Deferred to the operator (cannot be done from the repo):** redeploy with `DATABASE_PATH` pointing at a migrated+seeded SQLite file; set `NEXT_PUBLIC_SITE_URL=https://programmer-blog.jesspete.shop/`; rotate/set `DEV_AUTHOR_PASSWORD` (or rely on R-37 gating) before the next production boot; rotate `docs/ssh-key.txt` (carried from L-31).

*End of Pass 4 remediation plan.*

---

## 11. Pass 5 (2026-09-04) — Live E2E verification of the remediated deployment (R-48..R-56)

**Trigger:** the Pass 4 remediated codebase was redeployed to `https://programmer-blog.jesspete.shop/`. A fresh browser E2E pass (`agent-browser`, Playwright-class) verified every Pass 4 fix live (R-31, R-34, R-37, R-38, R-39 headers, feeds with 9 items, prod URLs in sitemap/RSS, security headers) — and uncovered a new tier of defects that only surface on a deployment with a **working, seeded database**, plus a Next.js 16 server-action contract break invisible to the unit suite.

**Method:** hybrid per `e2e-testing-lessons` skill — browser E2E against live + local repro (dev server, seeded SQLite), then root-cause in code. Full evidence matrix in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 5 Addendum".

### Findings (severity-ranked)

| ID | Sev | Finding | Root cause (code pointer) |
|---|---|---|---|
| C-37 | Critical | **All 6 server-action mutations 500 in production**: `createComment`, `createPost`, `updatePost`, `deletePost`, `moderateComment`, `updateSiteSettings`. React error #441 client-side; `POST /posts/[slug]` → 500 live; all four admin mutations repro 500 locally. | `features/blog/actions.ts` exports `createCommentInputSchema` (a Zod object) and `features/admin/actions.ts` exports `moderateCommentInputSchema` + `siteSettingsInputSchema` from `'use server'` files. Next.js 16 permits **only async function exports** — module evaluation throws `A "use server" file can only export async functions, found object.` at action-call time. |
| H-37 | High | `canonical`, `og:url`, `og:image` serve `http://localhost:3000` on prerendered pages (post pages, `/admin/login`) while sitemap/RSS advertise the prod domain. | `posts/[slug]` uses `generateStaticParams` (build-time SSG, no `revalidate`) — the build machine's env (without `NEXT_PUBLIC_SITE_URL`) is baked into the prerendered metadata. Sitemap/RSS self-heal via `revalidate=3600`; prerendered pages never do. |
| H-38 | High | Archive tag filter offers **dead filters**: `?tag=rust` / `typescript` / `go` → "0 essays" (dropdown lists all 12 tag rows). | `getAllTags()` returns every `tags` row without checking attachment to published posts. |
| M-40 | Medium | Every archive row shows "Uncategorised" (landing page shows real tags from mockup fallback data). | `archive/page.tsx` passes a hardcoded `[]` tags array to `postToArchiveItem` ("tags-per-row dropped for v1"). |
| M-41 | Medium | `robots.txt` advertises `Sitemap: http://localhost:3000/sitemap.xml` (verified live) for up to 24h after deploy. | robots route is `force-static` + `revalidate = 86400` — prerendered with build-time env. |
| M-42 | Medium | Mobile (390px) horizontal scroll — `scrollWidth` 484 vs 390. | Snippet-showcase grid children (`lg:col-span-4`/`lg:col-span-8`) lack `min-w-0`; the `.code-window pre` block (`white-space: pre`) contributes a 460px min-content width that inflates the single-column track. Mockup + port both affected. |
| L-38 | Low | Two `<h1>` elements on post pages (page header + MDX body's leading `# …`). | Seed `contentMdx` starts with `# Title`; render pipeline does not strip it. |
| L-39 | Low | `/unsubscribe` without a token headlines "**something broke**" for a user-input error. | Page error state conflates missing token with system failure. |

**False alarm cleared during testing:** invalid login *does* render "Invalid email or password." via `[data-testid=login-error]` (an earlier truncated snapshot suggested otherwise). Subscribe validation, rate limits and the auth action file are healthy.

### Remediation tasks

| Task | Fix | TDD plan | Status |
|---|---|---|---|
| R-48 | 'use server' files export only async functions: delete the local `createCommentInputSchema` from `features/blog/actions.ts` and import the canonical schema from `@devlog/types` (already exists, R-18); move `moderateCommentInputSchema` + `siteSettingsInputSchema` to a plain `features/admin/schemas.ts`; update tests. Add a **source-scan regression test** (`use-server-exports-scan.test.ts`) asserting no non-async exports in any `'use server'` file. | RED: scan test fails on current sources. GREEN: moves pass the scan; live-repro comment POST returns 200. | ✅ Complete |
| R-49 | Prerendered pages self-heal their metadata: `export const revalidate = 3600` on `posts/[slug]/page.tsx` and `/admin/login/page.tsx`. Operator checklist (R-56) gains "build with `NEXT_PUBLIC_SITE_URL` set". | RED: module-contract test asserting the revalidate exports (source scan). GREEN: exports present. | ✅ Complete |
| R-50 | Tags dropdown only offers tags in use: new `getTagsInUse()` query (DISTINCT tags joined to published posts via postsToTags); archive page consumes it. | RED: `queries.test.ts` integration test — an unused tag must not be returned. GREEN. | ✅ Complete |
| R-51 | Archive rows show real tags: new `getTagsForPosts(postIds)` batch query (single `IN` query, no N+1); archive page maps `postToArchiveItem(post, tags)`. | RED: integration test for grouped tags + archive page test asserting the tag name renders. GREEN. | ✅ Complete |
| R-52 | robots.txt revalidates like the feeds: `revalidate = 86400` → `3600`. | RED: module-contract test asserting the route's revalidate. GREEN. | ✅ Complete |
| R-53 | Mobile overflow fix, **mockup-first**: `landing_page_mockup.html` grid children gain `min-w-0` and a `.code-window pre { overflow-x: auto; }` rule; port 1:1 to `snippet-showcase.tsx` + `globals.css`. | RED: component test asserting `min-w-0` classes on the grid children + CSS rule present in both files. GREEN. | ✅ Complete |
| R-54 | Single H1 on post pages: pure `stripLeadingH1()` helper in `lib/blog.ts` applied to the MDX body render. | RED: unit tests for the helper (leading H1 stripped, non-leading preserved, no-H1 untouched) + post-page render test asserting exactly one `<h1>`. GREEN. | ✅ Complete |
| R-55 | Unsubscribe error copy: missing/invalid token renders a calm "couldn't confirm that unsubscribe link" state (keeps `$ <error>` line); success state unchanged. | RED: render test asserting the "something broke" headline no longer appears for the missing-token state. GREEN. | ✅ Complete |
| R-56 | Docs sync: this §11; audit report Pass 5 addendum; AGENTS/CLAUDE/README/SKILL updates (new anti-pattern AP-14, lesson L25, deploy checklist build-time env, test counts). | Docs diff review. | ✅ Complete |

### Validation of this plan against the codebase (pre-execution)

- `packages/types/src/comment.ts:16` already exports the canonical `createCommentInputSchema` (R-18) — the blog action can dedupe onto it. Confirmed.
- The admin schemas' only consumers are `features/admin/actions.test.ts` imports — safe to relocate. Confirmed.
- `packages/db/src/queries.test.ts` runs against a real SQLite file with fixtures (posts a/b/c, a `rust` tag) — new query tests slot in. Confirmed.
- `apps/web/src/session-cookie-scan.test.ts` provides the source-scan pattern to imitate. Confirmed.
- Mockup grid children at `landing_page_mockup.html:777-799`; port at `snippet-showcase.tsx:66`. Confirmed.
- Login page metadata is static (`(auth)/admin/login/page.tsx:19`); canonical inherits layout `metadataBase`. `revalidate` export is the minimal self-heal. Confirmed.

**Acceptance gate:** full `pnpm check` green; live-repro of a comment POST + admin mutations returns 200 locally; `rg "createCommentInputSchema" apps/web/src/features/blog/actions.ts` → 0 hits; archive rows render tag names; mobile viewport `scrollWidth == clientWidth`; docs updated.

### Pass 5 completion status

| Task | Finding(s) | Status |
|---|---|---|
| R-48 async-only 'use server' exports + source-scan test | C-37 | ✅ Complete |
| R-49 hourly revalidate on prerendered URL-bearing pages | H-37 | ✅ Complete |
| R-50 getTagsInUse() filter dropdown | H-38 | ✅ Complete |
| R-51 getTagsForPosts() archive rows | M-40 | ✅ Complete |
| R-52 robots.txt hourly revalidate | M-41 | ✅ Complete |
| R-53 min-w-0 + scrollable pre (mockup-first) | M-42 | ✅ Complete |
| R-54 stripLeadingH1() single H1 | L-38 | ✅ Complete |
| R-55 unsubscribe error copy | L-39 | ✅ Complete |
| R-56 docs sync (this §11, audit Pass 5 addendum, AGENTS/CLAUDE/README/SKILL) | — | ✅ Complete |

**Verification evidence:** `pnpm check-types` 0 errors; `pnpm lint` 0 errors/0 warnings; `pnpm test` 360/360 (25 new); `pnpm build` + postbuild green; standalone build like-for-like repro — comment POST 200 (row inserted `pending`), admin login + `moderateComment` approve (DB verified), mobile 390px `scrollWidth == clientWidth`. `pnpm audit --prod` 0 vulnerabilities (unchanged).

---

*End of Pass 5 remediation plan.*

---

## 12. Pass 6 (2026-09-04) — Tiered review + security audit remediation (R-57..R-71)

**Trigger:** the Pass 6 tiered audit (`code-review-and-audit` deep mode + live E2E) of the fully-remediated Pass 5 codebase. Findings, evidence and the E2E verification table live in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 6 Addendum" (C-38..C-39, H-39, M-43..M-48, L-40..L-44, I-9..I-11).

**Method:** TDD per `skills/tdd` + `skills/tdd-workflow` — every code task starts with a RED test run against the current tree, then the GREEN implementation, then REFACTOR, then the acceptance gate.

### Pre-execution validation of this plan against the codebase

| Assumption | Verified against |
|---|---|
| `createComment`/`subscribeToNewsletter` accept `ctx: { ip?: string }` and prefer it over `headers()` | `features/blog/actions.ts:47-76`, `features/subscribe/actions.ts:41-68` ✅ |
| Rate limiter stores a non-empty array on every allowed request and never deletes keys | `lib/rate-limit.ts:12-30` (docstring contradicts code) ✅ |
| Login page redirects on raw `searchParams.next`; `safeNext` exists only in `features/auth/actions.ts` | `(auth)/admin/login/page.tsx:39,50`; `features/auth/actions.ts:26-35` ✅ |
| Both secrets are `.optional()` so missing (≠ short) secrets never throw at parse time | `lib/env.ts:19,27,72-104` ✅ |
| `getSecret()` is the single HMAC key path, reading only `BETTER_AUTH_SECRET` | `packages/auth/src/tokens.ts:37-53` ✅ |
| `ArchiveItemData` defined in `features/landing/archive-preview.tsx`; consumed by `lib/blog.ts` + `features/blog/archive-list.tsx`; `ArchiveItem` consumed by landing + blog | grep + file reads ✅ |
| `renderMDX` imports `defaultMDXComponents` from features; exactly 2 production call sites (post-page, snippet page) + tests | grep ✅ |
| `stripLeadingH1` already exists in `lib/blog.ts` (R-54) and is pure/reusable for snippets | `lib/blog.ts` ✅ |
| `siteSettingsInputSchema` has 5 URL fields; `admin/schemas.ts` is a plain module (safe to extend) | `features/admin/schemas.ts` ✅ |
| `searchPosts` has no LIMIT and interpolates the raw `%query%` pattern | `packages/db/queries.ts:368-381` ✅ |
| `seed.test.ts` runs against a real SQLite file with a controllable `NODE_ENV` | `packages/db/src/seed.test.ts` ✅ |
| `devlog.db` seeded 9 posts / 12 tags / 3 subscribers / 2 comments / 1 author | local migrate+seed run ✅ |
| 360 tests currently green; type-check + lint clean (the no-regression floor for this pass) | executed this session ✅ |

### Tasks

| Task | Finding(s) | Fix (RED → GREEN → REFACTOR) | Status |
|---|---|---|---|
| R-57 | C-38, I-9 | RED: `seed.test.ts` — `runSeed()` with `NODE_ENV=production` and no `DEV_AUTHOR_PASSWORD` throws an actionable error; the literal default `'dev-password-12345'` never reaches `hashPassword` in that path. GREEN: production guard in `seed.ts` + `start_server.sh` generates a random `DEV_AUTHOR_PASSWORD` when absent + `.env.example` entry + header comment corrected (9 posts / 12 tags / 3 subscribers / 2 comments / 1 author). | ✅ Complete |
| R-58 | H-39 | RED: source-scan test asserting `features/*/actions.ts` never reference `ctx.ip` / accept a `ctx` param; action tests exercise the `headers()` path. GREEN: drop `ctx` from both signatures; IP always from `getClientIpFromHeaders(await headers())`; tests mock `next/headers`. | ✅ Complete |
| R-59 | M-43 | RED: `rate-limit.test.ts` — filling > `MAX_BUCKETS` distinct keys keeps the Map bounded (oldest keys evicted); stale single-entry buckets are pruned. GREEN: last-seen tracking + bounded eviction + docstring rewrite. | ✅ Complete |
| R-60 | M-44 | RED: extract `safeNext` into `features/auth/next-url.ts` (+ unit tests: absolute URL, protocol-relative `//`, backslash, non-`/admin` path all rejected → `/admin`); login-page test asserting `?next=https://evil.com` no longer redirects off-site. GREEN: page imports the shared helper. | ✅ Complete |
| R-61 | M-45 | RED: `env.test.ts` — `NODE_ENV=production` + absent `BETTER_AUTH_SECRET`/`SIGNED_TOKEN_SECRET` → `loadEnv()` throws; dev still boots with the warning fallback. GREEN: post-parse missing-critical check in `loadEnv()`. | ✅ Complete |
| R-62 | M-46 | RED: `tokens.test.ts` — `signToken` output verifies against `SIGNED_TOKEN_SECRET` (and fails against `BETTER_AUTH_SECRET` when they differ); dev fallback when unset; `createSessionToken` still keyed by `BETTER_AUTH_SECRET`. GREEN: `getTransactionSecret()` in `tokens.ts` + `signToken`/`verifyToken` use it. | ✅ Complete |
| R-63 | M-47 | RED: new `layer-boundary-scan.test.ts` — `lib/**` must not import `@/features/`, features must not import other features' internals; scan fails on the current tree. GREEN: `ArchiveItemData` → `domain/archive.ts` (with `MOCKUP_ARCHIVE`), `ArchiveItem` → `components/archive-item.tsx`, `renderMDX(source, { components })` required-components param, call sites + tests updated. | ✅ Complete |
| R-64 | M-48 | RED: snippet route test asserting exactly one `<h1>` per snippet page. GREEN: `renderMDX(stripLeadingH1(snippet.content))` in the snippet route. | ✅ Complete |
| R-65 | L-40 | RED: schema test — `javascript:alert(1)` / `data:` URLs rejected for the 5 URL fields. GREEN: `.refine(/^https?:\/\//i)` helper in `admin/schemas.ts`. | ✅ Complete |
| R-66 | L-41 | RED: `queries.test.ts` — a `%` query no longer matches every row; `searchPosts` result capped. GREEN: `escapeLikePattern()` + `LIMIT 50`. | ✅ Complete |
| R-67 | L-42 | RED: source-scan test asserting `packages/db/src/seed.ts` uses `pathToFileURL` (not string concat) for its direct-run guard. GREEN: adopt the `copy-standalone-assets.ts` pattern. | ✅ Complete |
| R-68 | L-43 | RED: source-scan test asserting `eslint.config.mjs` overrides reference only existing files. GREEN: fix `mdx.ts` → `mdx.tsx`; replace `components as never` with an explicit structural type + comment; fix the header filename. | ✅ Complete |
| R-69 | L-44 | RED: none possible (comment-only) — REFACTOR: rewrite the `paginate()` comment to describe actual behavior (window may exceed `maxVisible` with custom `siblings`; caller owns the cap). | ✅ Complete |
| R-70 | I-9..I-11, doc misalignments | Docs sync: audit report Pass 6 addendum + this §12; AGENTS.md (content source = DB, seed counts, `content/posts/` removal, Tailwind `[var(--*)]` carve-out, default-export route carve-out, env boot-throw semantics, SIGNED_TOKEN_SECRET semantics, DEV_AUTHOR_PASSWORD), CLAUDE.md (same + ESLint mechanism note), README.md (validation status, routes note, seed counts, env table), programmer-blog_SKILL.md (frontmatter Better Auth → homegrown HMAC, §2 env table, §3 bootstrapping, test counts), `.env.example` (+`DEV_AUTHOR_PASSWORD`). | ✅ Complete |

| R-71 | C-40 | RED: git-hygiene scan — `git ls-files` must not list any live-env file (`.env.local`); GREEN: `git rm --cached .env.local` (the `.gitignore` rule already exists). **Mandatory operator follow-up (cannot be done from this workspace): rotate `BETTER_AUTH_SECRET`, `SIGNED_TOKEN_SECRET`, `DEV_AUTHOR_PASSWORD` on the deployment and purge the committed values from git history.** | ✅ Complete (untrack + docs) |

**Risk-accepted (no code change):** C-39 (`docs/ssh-key.txt`) — deliberate operator workflow; follow-ups tracked in the audit addendum (deploy-key scoping, rotation, secret scanning).

### Acceptance gate

`pnpm check-types` 5/5 · `pnpm lint` 0/0 · `pnpm test` all green (360 + new regression tests) · `pnpm build` green · `pnpm audit --prod` 0 vulns · source-scan tests green (server-action exports, session cookie, layer boundaries, eslint refs) · docs updated.

## 13. Pass 7 (2026-09-04) — Tiered review + security audit remediation (R-72..R-94)

**Trigger:** the Pass 7 tiered audit (`code-review-and-audit` deep mode + fresh live E2E) proving the SPA against its documented contracts. Findings, evidence and the live E2E table live in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 7 Addendum" (C-41, H-40..H-41, M-49..M-55, L-45..L-56, I-12..I-15).

**Method:** TDD per `skills/tdd` + `skills/tdd-workflow` — every code task starts with a RED test run against the current tree, then the GREEN implementation, then REFACTOR, then the acceptance gate.

### Pre-execution validation of this plan against the codebase

| Assumption | Verified against |
|---|---|
| `.env.local.example` is tracked and carries filled 64-hex secrets + prod URL + author password | `git show HEAD:.env.local.example` ✅ |
| `.env.example` ships empty `RESEND_API_KEY=` / `CRON_SECRET=` / `DEV_AUTHOR_PASSWORD=`; `env.ts` Zod `.startsWith('re_')` / `.min(8)` fail on `''`; reproduced `pnpm build` failure locally | `.env.example`, `lib/env.ts:14-45`, build log ✅ |
| `robots.txt` route ships `Cache-Control: max-age=86400` while rss/sitemap ship 3600; live CF edge `HIT age: 34507` serving localhost sitemap; cache-busted MISS serves prod URL | `api/robots.txt/route.ts:33`, live curl A/B ✅ |
| `getClientIpFromHeaders` returns `xff.split(',')[0]`; consumed by login/subscribe/comment limiters | `lib/request-ip.ts:26-30` + call sites ✅ |
| Subscribe handler reads `e.currentTarget` after `await subscribeToNewsletter(...)`; React 19 nulls `currentTarget` post-dispatch | `features/landing/subscribe-section.tsx:54-56` + installed react-dom source ✅ |
| Root layout sets `canonical: '/'`; `/archive`, `/archive/page/[page]`, `/snippets` define metadata without `alternates` | `app/layout.tsx:95`, three page files ✅ |
| Hero glow wrapper div has `pointerEvents: 'none'` and holds the `useMouseGlow` ref listeners | `hero-mouse-glow.tsx:17-21`, `use-mouse-glow.ts:41-54` ✅ |
| `signToken`/`verifyToken` are bare `HMAC(payload)` — no `iat`/TTL/purpose; confirm email copy claims 24h expiry | `packages/auth/src/tokens.ts:142-156`, `confirm-email.tsx:86` ✅ |
| CSP string lacks `base-uri`/`object-src`/`form-action` | `next.config.ts:7` ✅ |
| `postsToTags` has two indexes, no unique constraint; `createPost`/`updatePost` insert `data.tagSlugs` un-deduped | `schema.ts:103-114`, `admin/actions.ts:137-144,207-212` ✅ |
| `updatePost` never clears `publishedAt` on →draft and has no slug pre-check (createPost has one) | `admin/actions.ts:179-212` ✅ |
| CSV guard regex is `/^[=+\-@]/` | `lib/csv.ts:13` ✅ |
| `getArchivePosts`/`getArchiveCount` pass raw pageSize to drizzle LIMIT; `postEpochSeconds(null) → 0` feeds `getAdjacentPosts` | `packages/db/src/queries.ts:25-29,57-63,95-102,134-174` ✅ |
| Comments page does `db.select().from(posts).all().filter(...)` | `admin/(dashboard)/comments/page.tsx:39-41` ✅ |
| Seeded `siteSettings.rss = '/rss.xml'`; settings schema requires `z.string().url()` on rssUrl | `seed.ts:286`, `admin/schemas.ts:26-30` ✅ |
| `send.ts` `re_test_` branch returns a live client with a fake key; `index.ts` docstring claims stub success | `packages/email/src/send.ts:78-86`, `index.ts:8-10` ✅ |
| `useTypewriter` hidden-tab branch sets an empty 200ms callback, no visibilitychange resume | `hooks/use-typewriter.ts:52-57` ✅ |
| 8 arbitrary Tailwind literals (`min-h-[60vh]` ×5, `min-w-[180px]`, `min-w-[200px]`) | grep ✅ |
| `start_server.sh:155` echoes the generated password value | file read ✅ |
| Seed prod guard rejects only the literal `dev-password-12345` | `packages/db/src/seed.ts:47-63` ✅ |
| 405 tests green; type-check + lint clean (the no-regression floor for this pass) | executed this session ✅ |

### Tasks

| Task | Finding(s) | Fix (RED → GREEN → REFACTOR) | Status |
|---|---|---|---|
| R-72 | C-41 | RED: source-scan test asserting every tracked `*.example` env file contains only placeholder values (no `[0-9a-f]{64}` hex, no `https://programmer-blog.jesspete.shop`, no filled `DEV_AUTHOR_PASSWORD`). GREEN: `.env.local.example` values → placeholders; header comment marks it a template. Operator action recorded: rotate all three secrets on the deployment. | ✅ Complete |
| R-73 | H-40 | RED: `env.test.ts` — `NODE_ENV=production` with `RESEND_API_KEY=''` (empty string, not absent) parses successfully as undefined; same for `DEV_AUTHOR_PASSWORD=''`/`CRON_SECRET=''`; required-in-prod secrets still throw when empty. GREEN: strip `'' → undefined` across `process.env` before `safeParse`. | ✅ Complete |
| R-74 | H-42 | RED: unsubscribe page test — GET with a valid token renders a confirmation form and performs **no** DB write; the Server Action (POST) performs the write; invalid token unchanged. GREEN: page renders confirm UI (email shown, hidden token field); new `confirmUnsubscribe` server action in `features/subscribe/actions.ts` does token verify + update + rate limit; tests updated. | ✅ Complete |
| R-75 | M-49 | RED: `robots.txt/route.test.ts` asserts `Cache-Control: public, max-age=3600, s-maxage=3600` (currently 86400 → RED). GREEN: align header with rss/sitemap. Operator note: purge the CF cache once post-deploy. | ✅ Complete |
| R-76 | M-50 | RED: `request-ip.test.ts` — `"9.9.9.9, 1.1.1.1"` in `x-forwarded-for` resolves `1.1.1.1` (rightmost hop), not `9.9.9.9`; single-entry and whitespace variants; fallbacks unchanged. GREEN: take the last non-empty XFF entry; docstring rewritten. | ✅ Complete |
| R-77 | M-51 | RED: `subscribe-section.test.tsx` — a successful submit resolves without unhandled rejection and blurs the input (currently throws on `e.currentTarget` post-await → RED). GREEN: capture `const form = e.currentTarget` before the first await. | ✅ Complete |
| R-78 | M-52 | RED: render tests for `/archive`, `/archive/page/[page]`, `/snippets` asserting `link[rel=canonical]` equals the page's own URL (currently inherits `/` → RED). GREEN: explicit `alternates.canonical` per page. | ✅ Complete |
| R-79 | M-53 | RED: composition test — moving the pointer over the hero section updates the glow position (currently never fires → RED). GREEN: `useMouseGlow` attaches listeners to the hero section; overlay div stays pointer-transparent. | ✅ Complete |
| R-80 | M-54 | RED: `tokens.test.ts` — `createTransactionToken(id, { purpose: 'confirm', ttlSeconds: 7d })` produces `<id>.<iat>.confirm.<hmac>`; `verifyTransactionToken(…, 'confirm')` passes <7d, fails >7d, fails wrong purpose; legacy v1 `<id>.<hmac>` still verifies for `unsubscribe`/`preferences`. GREEN: v2 token format + purpose-tagged verification; `subscribeToNewsletter` mints confirm tokens with TTL; confirm route enforces it; email copy "expires in 7 days". | ✅ Complete |
| R-81 | M-55 | RED: `next.config.test.ts` asserts the CSP contains `base-uri 'self'`, `object-src 'none'`, `form-action 'self'`. GREEN: append the three directives. | ✅ Complete |
| R-82 | L-45 | RED: `queries.test.ts` — duplicate (postId, tagId) rows impossible (insert twice → constraint error / single row); admin action test — `tagSlugs` with duplicates produces one row per tag. GREEN: unique index migration (`posts_to_tags_unique`) + `[...new Set(data.tagSlugs)]` in both actions. | ✅ Complete |
| R-83 | L-46 | RED: admin action tests — `updatePost` with `status: 'draft'` nulls `publishedAt`; slug collision with a different post returns the same field error as createPost; self-slug unchanged allowed. GREEN: implement both checks (exclude current id). | ✅ Complete |
| R-84 | L-47 | RED: `csv.test.ts` — leading `\t` and `\r` cells are guard-prefixed. GREEN: regex → `/^[\t\r=+\-@]/`. | ✅ Complete |
| R-85 | L-48 | RED: `queries.test.ts` — `getArchivePosts(1, 0)` / `(1, -5)` behave as pageSize 1 (no unbounded scan); `getAdjacentPosts` for a post with null `publishedAt` returns `{previous:null, next:null}`. GREEN: clamp + guard. | ✅ Complete |
| R-86 | L-49 | RED: source-scan/render test — the comments page no longer loads the full posts table (`from(schema.posts).all()` without a where clause). GREEN: `getPostsByIds()` (inArray) in `@devlog/db` used by the page. | ✅ Complete |
| R-87 | L-50 | RED: schema test — `rssUrl: '/rss.xml'` (site-relative) passes; `javascript:` still fails. GREEN: allow `/…` paths for `rssUrl` only (social URLs stay absolute per R-65). | ✅ Complete |
| R-88 | L-51 | RED: `send.test.ts` — `re_test_*` API keys produce `{ ok: false, skipped: true, testMode: true }` without contacting Resend; docstring matches. GREEN: `getResend` treats `re_test_` like absent; dead branch removed; `index.ts` docstring fixed. | ✅ Complete |
| R-89 | L-52 | RED: `use-typewriter.test.tsx` — after a tab-hide, a `visibilitychange` to visible resumes typing (chars continue). GREEN: resume hook on `visibilitychange`. | ✅ Complete |
| R-90 | L-53 | RED: source-scan test asserting no `min-h-[60vh]` / `min-w-[1-9][0-9]0?px` literals outside `globals.css`/mockup. GREEN: `.min-h-page` component class + Tailwind spacing-scale `min-w-45`/`min-w-50` replacements. | ✅ Complete |
| R-91 | L-54 | RED: source-scan test asserting `start_server.sh` never echoes `$gen_pw`. GREEN: print the storage location only. | ✅ Complete |
| R-92 | L-55 | RED: `seed.test.ts` — production seed with a 12-char `DEV_AUTHOR_PASSWORD` throws (minimum 16 chars); dev unaffected. GREEN: length floor in the prod guard. | ✅ Complete |
| R-93 | L-56 | RED: n/a (docstring-only). GREEN: as-built docstrings for `recent-notes.tsx`, `archive-preview.tsx`, `comment-form.tsx`, `mdx-components.tsx`, `(public)/layout.tsx`, `use-github-stats.ts` (landing mockup-faithful by design; anonymous comments by design; no sonner; fetch-once stats). | ✅ Complete |
| R-94 | I-13, I-14, I-15 + doc drift | Doc pass: AGENTS/CLAUDE — Server Action return shape `{ ok: true/false, … }` (as-built), env empty-string semantics, robots cache behavior, token TTL contract; README — route count 27, validation counts updated, Pass 7 status line; SKILL.md — new lessons (React 19 currentTarget, pointer-events composition testing, canonical inheritance, XFF rightmost, env empty-normalization, token v2 TTL). | ✅ Complete |

### Acceptance gate (same as Pass 6)

`pnpm check-types` (5/5) && `pnpm lint` (0/0) && `pnpm test` (all green, new RED tests included) && `pnpm build` (34/34 + postbuild). Local standalone smoke re-run for the unsubscribe/confirm flows before sign-off.

### Operator actions required after this pass (not code)

1. **Rotate** `BETTER_AUTH_SECRET`, `SIGNED_TOKEN_SECRET`, `DEV_AUTHOR_PASSWORD` on the deployment (C-41 — the tracked example file leaked the production-format values).
2. **Purge** the leaked values from git history (BFG / git-filter-repo) together with the C-40 scrub.
3. **Purge the Cloudflare cache** for `/robots.txt` after deploying R-75 (the 24h edge entry predates the fix).
4. Scope/rotate the committed SSH key (H-41 backlog, unchanged from Pass 6).

### Deferred backlog (design-level, unchanged scope discipline)

- Nonce-based CSP `script-src` (remove `'unsafe-inline'` for scripts) — needs proxy-issued nonces + theme-script rework.
- Session revocation story (`tokenVersion` column or adopting the reserved `sessions` table).
- `next/image` `remotePatterns` host allowlist (currently `https://**`).
- Playwright E2E suite in-repo (still deferred per MEP Phase 8+).

---

## 14. Pass 8 (2026-09-04) — Release-gate dependency audit + auth hardening + doc re-sync (R-95..R-97)

Trigger: operator-requested fourth tiered review + live E2E re-verification. Findings C-42/H-43/M-56/M-57/L-57 are detailed in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 8 Addendum". Every task below follows RED → GREEN → REFACTOR; the full gate (`pnpm check`) is the acceptance gate.

### R-95 — C-42 + L-57: remove the dead `react-email` runtime dependency; fix the inert-override comment

- **Why:** `pnpm audit --prod` reports 41 vulnerabilities (2 critical / 15 high) — all routed through `packages/email > react-email@3.0.7 > next@15.1.2` (+ esbuild 0.23, glob 10.3.4, @babel/core 7.24.5, prismjs, postcss, sharp). `react-email` (the preview CLI) is imported by nothing and executed by no script; the `pnpm-workspace.yaml` overrides that were supposed to pin this subtree are inert under pnpm 9.15.4. The `pnpm check` gate cannot pass.
- **RED:** new `packages/email/src/deps-scan.test.ts` reads `packages/email/package.json` and asserts `react-email` is NOT in `dependencies` (and that the render libraries `@react-email/components` + `@react-email/render` ARE) — fails before the fix.
- **GREEN:** `pnpm --filter @devlog/email remove react-email` (package manager only — no hand-editing the manifest), `pnpm install` to refresh the lockfile; correct the `pnpm-workspace.yaml` comment (workspace-level `overrides` require pnpm ≥10; under 9.15.4 they are inert — the 9.15-compatible place is `package.json#pnpm.overrides`).
- **REFACTOR:** none required — removal is the refactor.
- **Acceptance:** `pnpm audit --prod` → 0 vulnerabilities; `pnpm --filter @devlog/email test` green incl. the new pin; full `pnpm test` green (459 + 2 new assertions).

### R-96 — H-43: signIn unknown-user branch must do comparable scrypt work

- **Why:** unknown email returns before any scrypt work; known email + wrong password runs scrypt N=2^15 (~100ms). Response-time delta leaks whether an email is a valid author (OWASP authentication-failure enum).
- **RED:** new `packages/auth/src/index.timing.test.ts` partially mocks `./password` (`importOriginal` + `vi.fn` wrapper) and asserts `verifyPassword` IS invoked for an unknown-email sign-in — fails before the fix.
- **GREEN:** in `packages/auth/src/index.ts`, the `!user` branch first `await`s `verifyPassword(password, TIMING_EQUALIZER_HASH)` against a pre-generated constant hash in the repo's `scrypt:N:r:p:salt:hash` format (no runtime keygen; identical error surface + generic error afterwards).
- **REFACTOR:** keep the dummy-hash comment explaining the OWASP rationale (prevents "why is this here" deletion later).
- **Acceptance:** `pnpm --filter @devlog/auth test` green (37 + 2 new); no observable behavior change (still generic error, still `ok:false`).

### R-97 — M-56 + M-57: documentation re-sync to the as-built gate and test baseline

- **CLAUDE.md:** Build Commands table row for `pnpm check` → `check-types && lint && test:coverage && audit --prod && build` (five stages).
- **AGENTS.md:** §Commands note "`pnpm check` runs all four" → "runs all five stages (types, lint, coverage, audit, build)".
- **programmer-blog_SKILL.md:** front-matter `project_state` + header note + §2.3 + §11 counts 405 → **459 (355 web / 41 db / 37 auth / 21 types / 5 email)**; state line → Passes 4–8 (R-37..R-97) complete; §20.2 `Env` interface gains `DEV_AUTHOR_PASSWORD?: string`.
- **README.md:** Audit Status gains the Pass 8 paragraph (C-42/H-43 summary + remediation pointer); audit posture line reverts to 0 after R-95.
- **Acceptance:** every changed claim spot-checked against `package.json` / live test run (evidence in the Pass 8 Addendum verification ledger).

---

## 15. Pass 9 (2026-09-05) — Tiered review + live E2E remediation (R-98..R-101)

**Trigger:** operator-requested fifth tiered review + live E2E of the Pass 8 remediated codebase. Findings, evidence and the live E2E matrix live in `CODE_REVIEW_AUDIT_REPORT.md` "Pass 9 Addendum" (H-44, M-58..M-59, L-58..L-59, I-20..I-22).

**Method:** TDD per `skills/tdd` + `skills/tdd-workflow` — every code task starts with a RED test run against the current tree, then the GREEN implementation, then REFACTOR, then the acceptance gate.

### Pre-execution validation of this plan against the codebase

| Assumption | Verified against |
|---|---|
| `globals.css` has zero `@layer {` blocks while its header claims "@layer components structure" | `grep -c '@layer' globals.css` → only the docstring ✅ |
| Compiled CSS contains `.hidden` + `@media(min-width:40rem) .sm\:inline-flex` but live `.stat-pill` computes `display:flex` at 390px (unlayered beats `@layer utilities`) | live bundle `26-6-4up5cn8j.css` + browser `getComputedStyle` ✅ |
| nav scrollWidth 415 > clientWidth 390 at 390px; cyber theme button right edge 411px (clipped, unreachable) | agent-browser measurement on live site ✅ |
| `.tag` pairs with `hidden md:inline-block` in `archive-item.tsx`; `.tag` sets `display:inline-block` unlayered | source read ✅ |
| Only `.stat-pill` and `.tag` pair display-setting component classes with responsive display utilities (blast radius) | grep over all component-class usages ✅ |
| Marquee inline color is `var(--muted)` in BOTH `landing_page_mockup.html:701` and `marquee.tsx:31` | file reads ✅ |
| Live contrast 3.2:1 (fg `#8a8275` on composited `#113b40`) — hero cyan glow over `--bg-elev` | Lighthouse axe detail + token recomputation ✅ |
| `admin/actions.ts:293` logs `'oderateComment] DB error'` (typo) | source read ✅ |
| `auth/index.ts:10-12` header docstring documents v1 `<userId>.<hmac>` format | source read ✅ |
| 464 tests green; five-stage `pnpm check` green (the no-regression floor) | executed this session ✅ |

### Tasks

| Task | Finding(s) | Fix (RED → GREEN → REFACTOR) | Status |
|---|---|---|---|
| R-98 | H-44 | RED: new `apps/web/src/css-layer-scan.test.ts` — parse `globals.css` and assert (a) the file declares `@layer components {`, (b) the display-setting component classes (`.stat-pill`, `.tag`, `.btn-primary`, `.btn-secondary`, `.theme-btn`) are defined INSIDE the layer block, (c) no unlayered top-level rule for those selectors survives. GREEN: wrap the component-class region in `@layer components { … }` (keep `@theme`, raw-token `@media` tweaks, and reduced-motion blocks as-is). REFACTOR: header comment now matches reality. | ✅ Complete |
| R-99 | M-58 | Mockup-first: `landing_page_mockup.html` marquee inline color `var(--muted)` → `var(--fg-dim)` (explicit, documented a11y design decision), then port the same one-line change to `marquee.tsx`. RED: `marquee.test.tsx` render assertion — the `.marquee` element carries `color: var(--fg-dim)` (fails against the current tree). GREEN: apply the change. REFACTOR: none. | ✅ Complete |
| R-100 | L-59 (+ L-58 retracted) | L-58 withdrawn at byte level (`od -c` proves the tag is `'[moderateComment] DB error'` — the sighting was a terminal misread, the I-17 failure mode; retracted per the no-inflated-findings rule). Ships `admin-log-tag-scan.test.ts` as a prevention pin only (green against the correct tree). L-59 (byte-verified): `auth/index.ts` header re-synced to the v2 `<userId>.<iat-seconds>.<hmac(userId.iat)>` format with the server-side 30-day TTL + legacy-rejection note (comment-only, no RED possible per R-69 precedent). | ✅ Complete |
| R-101 | M-59 + doc drift | Doc pass: README — Pass 9 paragraph, audit posture, test count 464→465+ (post-R-98..R-100), live-E2E status; AGENTS.md — CSS layer contract (`@layer components` is now load-bearing), marquee token note; CLAUDE.md — same Tailwind-layer note; SKILL.md — §8 accessibility claim corrected to AA-with-exceptions, perf budget qualified (local-build metric), §2.3 test counts, front-matter state line, new lessons. | ✅ Complete |

### Acceptance gate

`pnpm check` (five stages) green · new scan/render tests green · live re-verification after deploy: 390px viewport — GitHub pill hidden <640px, cyber theme button fully visible/reachable, no horizontal scroll.

### Operator actions required after this pass (not code)

1. **Cloudflare zone:** set Browser Cache TTL to "Respect Existing Headers" (or ≤3600s) so browsers honor the origin's `max-age=3600` on `robots.txt` (I-20).
2. **Standing from Passes 6–8:** rotate/scope the committed SSH key; keep the deferred backlog (nonce CSP, session revocation, `next/image` allowlist, Playwright in-repo, R-30 coverage) visible in planning.

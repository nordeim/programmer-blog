// alignment findings

No criticals in the docs. Six highs will still mis-steer an agent.
Severity is “what happens if an agent trusts this sentence.” Evidence is from the GitHub tree and live fetches, not from re-running pnpm test.

all
AGENTS.md
CLAUDE.md
README.md
SKILL.md
cross-doc
adjacent
all
high
medium
low
info
24 findings


D-01
high
Header still stamped Pass 7 after R-97
CLAUDE.md
verified
location
CLAUDE.md YAML / first heading — last_updated: 2026-09-04 (Pass 7)

R-97 was explicitly a doc re-sync of the five-stage gate into CLAUDE.md/AGENTS.md. The file body mentions pnpm check as five stages in the commands table, but the freshness stamp and the 'Revalidated' blurb still stop at Pass 7 (R-72..R-93).

evidence
Fetched CLAUDE.md: 'last_updated: 2026-09-04 (Pass 7)'. README and SKILL.md both claim Pass 8 (R-95..R-97) complete.

impact
Agents load CLAUDE.md first and will treat Pass 7 as current, missing C-42/H-43 lessons (inert overrides, signIn timing).

recommended
Bump last_updated to Pass 8. Extend the revalidated blurb with R-95 (react-email CLI removed), R-96 (dummy scrypt on unknown emails), R-97 (five-stage gate).


D-02
high
VERIFY step still lists a four-stage gate
CLAUDE.md
verified

D-03
high
Phase 2 still claims a Better Auth instance
README.md
verified

D-04
high
pnpm-workspace.yaml described as the live overrides home
SKILL.md
verified

D-05
high
createComment still documents attacker-serializable ctx.ip
SKILL.md
verified

D-06
high
Anti-patterns contradict R-46 Drizzle precision
CLAUDE.md
verified

D-07
medium
E2E described as 'not in scope' while Passes 3–8 were live E2E
cross-doc
verified

D-08
medium
Remediation plan still described as 29 tasks R-1..R-29
README.md
verified

D-09
medium
Pass 6 addendum is ordered after Pass 8
README.md
verified

D-10
medium
Default-export anti-pattern drops the Next.js exception
CLAUDE.md
verified

D-11
medium
Duplicate pnpm start row; PPR still 'enable in Phase 4'
CLAUDE.md
verified

D-12
medium
ADR-005 still titled Better Auth
SKILL.md
verified

D-13
medium
MEP described as 8-phase; README is 9 + 9.5
SKILL.md
verified

D-14
medium
§20.8 says no OG/storage layer; Pass 2 added next/og
SKILL.md
reasoned

D-15
medium
Required verify order omits coverage + audit
AGENTS.md
verified

D-16
low
FALLBACK_FORKS 12400 (domain) vs 4180 (env)
cross-doc
verified

D-17
low
DEV_AUTHOR_PASSWORD Zod min(8) vs prod seed ≥16
CLAUDE.md
verified

D-18
low
next.config comment still mentions content/posts/*.mdx
README.md
verified

D-19
low
Root package.json description still names Better Auth
adjacent
verified

D-20
low
Mouse-glow still in z-index map after M-53 dead-code finding
SKILL.md
reasoned

D-24
low
WCAG target mismatch: SKILL says AAA, CLAUDE is silent, live is AA-ish
CLAUDE.md
verified

D-21
info
No freshness stamp; otherwise the most accurate of the four
AGENTS.md
reasoned

D-22
info
sessions table comment still says Better Auth
cross-doc
verified

D-23
info
464-test badge not re-run in this review
README.md
unverifiable

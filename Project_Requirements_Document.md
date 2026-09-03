# `/dev/log` — Project Requirements Document (PRD) v1.0

**Project:** `/dev/log — Notes from a Programmer's Desk`
**Classification:** Internal Engineering Reference
**Status:** DEFINITIVE, PRODUCTION-LOCKED BLUEPRINT
**Companion Document:** `Project_Architecture_Document.md` (PAD), `Master_Execution_Plan.md` (MEP)
**Last Updated:** 2026-08-26
**Author:** Engineering (generated from `landing_page_mockup.html` and skills/ folder)
**Audience:** Senior Engineers, Tech Leads, Onboarding Engineers, AI Coding Agents

> **Reading rule.** This PRD defines *what* the system is and *why* it exists. Every functional requirement traces to a visible element in `landing_page_mockup.html` or a non-functional constraint derived from the requested tech stack. The PAD defines *how* it is built. The MEP defines *in what order*. Do not modify this document without committing a revision block entry.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Vision & Design Thesis](#2-project-vision--design-thesis)
3. [Target Users & Personas](#3-target-users--personas)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Tech Stack & Tooling](#6-tech-stack--tooling)
7. [Commands](#7-commands)
8. [High-Level Project Structure](#8-high-level-project-structure)
9. [Code Style](#9-code-style)
10. [Testing Strategy](#10-testing-strategy)
11. [Boundaries — Always / Ask First / Never](#11-boundaries--always--ask-first--never)
12. [Success Criteria & Acceptance Tests](#12-success-criteria--acceptance-tests)
13. [Open Questions](#13-open-questions)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

`/dev/log` is the personal programmer's blog of the fictional author **Alex Rivera** — "software engineer writing about the craft. TypeScript today, Rust tomorrow, assembly for fun." The site is currently shipped as a single static HTML mockup file (`landing_page_mockup.html`) at the repository root. The objective of this engagement is to replace that static artifact with a production-ready, enterprise-grade Next.js 16 monorepo whose dynamic landing page reproduces the mockup pixel-for-pixel (typography, color tokens, motion, interaction) while introducing a real persistence layer (Drizzle ORM + better-sqlite3), real authentication (Better Auth), real email (Resend), and a comprehensive test suite (Vitest + jsdom).

The product is a long-form essay blog with an editorial, terminal-inspired aesthetic. The brand voice is "warm, opinionated, anti-generic — the kind of blog a senior engineer would actually subscribe to." The visual identity rejects the typical purple-gradient SaaS cliché in favor of a fixed-width, terminal-tinted dark palette (cream-on-near-black with amber and cyan accents), an italic Fraunces display face, and a JetBrains Mono logotype (`/dev/log█`). The site must ship with three themable variants — `dark` (default), `light`, and `cyber` (CRT scanlines, neon green on near-black) — and the theme switcher must be both keyboard-operable (`T` to cycle) and resilient to SSR/CSR hydration mismatches.

Beyond the landing page, the product surface includes a blog archive (filterable, paginated), individual essay pages rendered from MDX, a snippet library with copy-to-clipboard, an email subscription flow backed by Resend double-opt-in, a minimal admin surface for the author, and a GitHub live counter that pulls stars/forks from the public GitHub REST API with graceful fallback to plausible numbers when rate-limited. The site targets WCAG 2.2 Level AA as a baseline (AAA where the design system allows it), passes Core Web Vitals on LCP/INP/CLS, and is structured so that every page is statically generatable (ISR for posts, SSG for landing, on-demand revalidation for archive).

The acceptance bar is high: the project ships only when every test in the MEP passes, `pnpm check-types` / `pnpm lint` / `pnpm test` / `pnpm build` are all green, the landing page renders indistinguishably from the mockup at the three default breakpoints (mobile 375px, tablet 768px, desktop 1280px), and the documents (PRD, PAD, MEP) are committed alongside the code on the `main` branch of `nordeim/programmer-blog`.

---

## 2. Project Vision & Design Thesis

### 2.1 Vision

The web is saturated with programmer blogs that look like Dev.to clones: stock Inter typography, indigo-to-pink hero gradients, three-up "feature card" layouts, and the same Mailchimp embed. `/dev/log` rejects this template explicitly. The vision is to ship a blog that *feels* like a programmer's terminal — a quiet, monospace-forward surface where the writing is the product and the chrome gets out of the way. Every animation has a purpose (the typewriter hints at the author's voice; the progress bar gives a sense of how long the essay is; the scroll reveal rewards attention), and every UI element must pass the "Anti-Generic Litmus Test": Why does it exist? Is this the only way? What is lost if we remove it?

### 2.2 Design Thesis

**"Editorial Terminal"** — the intersection of a long-form magazine (Harper's, The Paris Review) and a programmer's actual desk at 2am: amber CRT phosphor, JetBrains Mono prompts, italic Fraunces body for the actual reading. Whitespace is structural. Motion is restrained. The cursor blinks because real terminals blink. The hero greeting types itself because that is what a `$ ` prompt does. The three themes (`dark`, `light`, `cyber`) are not skins — they are three discrete identities, each with its own color tokens, syntax highlighting palette, and (in the cyber case) CRT scanline overlay. A user toggling between themes should feel like switching virtual consoles, not flipping a switch on a marketing page.

### 2.3 Non-Negotiable Design Rules

The following are enforceable in review and (where possible) via ESLint:

- ❌ No purple-to-pink gradients on hero or anywhere else.
- ❌ No Inter, Roboto, or system-ui as the primary typeface. Fraunces + JetBrains Mono + Space Grotesk only.
- ❌ No drop shadows as the primary depth signal. Elevation is communicated by surface color shift and 1px borders.
- ❌ No `bg-amber-*`, `bg-cyan-*`, `bg-red-*` Tailwind defaults. Semantic tokens only.
- ❌ No glassmorphism / blur backdrops on cards.
- ❌ No "Subscribe to my newsletter!" pill CTAs. Buttons are sharp-cornered rectangles with monospace microcaps labels.
- ❌ No three-up symmetric feature card grids on the landing page. The mockup's article grid is fine because the cards carry real content (issue numbers, tags, read-time), not features.
- ✅ Color contrast ≥ 7:1 (WCAG AAA) on all body text.
- ✅ Keyboard operability on every interactive element. `T` cycles theme. `Tab` is visible. `Escape` closes any modal.
- ✅ `prefers-reduced-motion` is respected — all animations fall back to instant.
- ✅ Self-hosted fonts via `next/font/local` (no Google Fonts CDN in production).

### 2.4 Out of Scope

The following are explicitly out of scope for this engagement and will not be built, even if mentioned in adjacent skills:

- Stripe billing / paid subscriptions (the blog is "free forever. Or until I run out of coffee." — mockup line 1004).
- Sanity CMS or any headless CMS integration (the author writes in MDX committed to the repo).
- Trigger.dev / Inngest / BullMQ background job queues (we use Resend's API directly; no queue infra).
- tRPC v11 — the API surface is small (subscribe, comments, GitHub stats); plain Next.js Server Actions and Route Handlers suffice. This is a deliberate simplification to keep the monorepo lean.
- Cloudflare R2 / Upstash / Vercel KV — better-sqlite3 is the sole persistence layer for v1.
- Docker / Kubernetes — the v1 deploy target is a single Node process. A `Dockerfile` is included for future use but is not the primary delivery.

---

## 3. Target Users & Personas

### 3.1 Primary Persona — "The Discerning Reader"

**Name:** Sam
**Role:** Senior backend engineer at a mid-size SaaS
**Why they're here:** Sam subscribes to ~12 engineering blogs. They will unsubscribe the moment they smell a "10x" headline or a pop-up modal. Sam reads at lunch on a 13" laptop, dark mode on, and they bookmark essays they want to re-read. They judge a blog by its typography first and its content second.

**What Sam needs from `/dev/log`:**
- A landing page that loads in under 1.5 seconds on a normal connection (LCP target ≤ 1.2s on desktop).
- A reading experience that does not jump (CLS ≤ 0.05) as fonts/images load.
- A theme that respects their OS preference on first load (system preference → `prefers-color-scheme`).
- A subscription flow that does not require a password to subscribe (just email + confirmation).
- An RSS feed. Sam uses NetNewsWire. If there's no RSS, Sam leaves.
- An archive that supports pagination and tag filter, because Sam will read 30 essays in a row once they trust the author.

**Sam's failure modes:**
- A modal pop-up appearing 3 seconds after page load → instant bounce.
- A "Subscribe for more content like this!" banner pinned to the bottom of the screen → instant bounce.
- Hydration mismatch on theme → the page flashes light-then-dark → Sam closes the tab.
- Email confirmation that takes 4 minutes to arrive → Sam assumes it failed.

### 3.2 Secondary Persona — "The Author"

**Name:** Alex Rivera (the fictional author)
**Role:** Sole author and administrator
**Why they're here:** Alex writes one essay every other Tuesday. They want to: write in MDX in their editor of choice, commit, push, and have the site re-render. They want to see subscriber counts. They want to read and moderate comments. They do not want a WYSIWYG admin.

**What Alex needs:**
- An MDX authoring workflow with no build step beyond `git push` (Next.js picks up the MDX file on the next build or via on-demand ISR).
- An admin surface at `/admin` gated by Better Auth (email + password, no OAuth for v1).
- A subscriber list view with CSV export.
- A comment moderation queue.
- A "publish" action that triggers a Resend email to all confirmed subscribers with the new essay.
- A drafts view — essays committed with `publishedAt: null` are not visible to readers but appear in `/admin/drafts`.

### 3.3 Tertiary Persona — "The First-Time Visitor"

**Name:** transient traffic from Hacker News / Lobsters / a friend's link
**Role:** Read this one essay and decide whether to subscribe
**What they need:**
- An essay page that loads fast and reads well on mobile.
- A subscribe CTA at the bottom of the essay that does not interrupt the reading flow.
- A clear way back to the landing page or to the archive.
- A theme toggle that persists across visits (localStorage).
- Respect for `prefers-reduced-motion` — no scrolljacking, no auto-playing video, no parallax that fights them.

### 3.4 Non-Personas (Explicitly Not Served)

- Mobile-app users. v1 is web-only.
- Screen-reader users on ancient browsers (IE11, Safari < 14). Modern evergreen browsers only.
- SEO scrapers that expect AMP. We do not ship AMP.
- Ad networks. We run no ads. The footer reads `© 2024 Alex Rivera · built with care, not frameworks`.

---

## 4. Functional Requirements

Each requirement has an ID (`FR-N`), a traceability link to the mockup element it implements, and acceptance criteria. Requirements marked **[MOCKUP-EXACT]** must reproduce the mockup pixel-for-pixel at the listed breakpoints.

### 4.1 Landing Page (`/`)

**FR-1 — Reading Progress Bar [MOCKUP-EXACT]**
- Traceability: mockup lines 583, 1067–1076 (`.progress-bar`, `updateProgress`).
- A 3px fixed bar at the top of the viewport. Width is `(scrollTop / (scrollHeight - innerHeight)) * 100`. Background is `linear-gradient(90deg, var(--accent), var(--accent-2))`. Box-shadow `0 0 12px var(--accent), 0 0 4px var(--accent)`. Z-index 100.
- Acceptance: bar reaches 100% width at end of page, 0% at top. Hidden on `prefers-reduced-motion` (instead, the bar is static at 100% when the page is scrolled past hero).

**FR-2 — Fixed Navigation Header [MOCKUP-EXACT]**
- Traceability: mockup lines 586–617 (`<header>`, nav, logo, theme toggle, GitHub pill).
- Header is `fixed; top:0; left:0; right:0; z-index:50`. Backdrop `blur(16px)`. Background `rgba(var(--accent-rgb), 0.02)`. Bottom border `1px solid var(--border)`.
- Left: logotype `/<span style="color:accent">dev</span>/<span style="color:muted">log</span>█` with the blinking block-cursor. The cursor is a `<span class="logo-cursor">` rendering `display:inline-block; width:0.5em; height:1em; background:var(--accent); animation: blink 1.1s steps(1) infinite;`.
- Center (hidden on `< md`): nav links `notes`, `snippets`, `archive`, `about`. Each link is a `.hover-link` with the underline-on-hover effect (`width:0 → 100%` over 0.35s cubic-bezier(0.4,0,0.2,1)).
- Right: GitHub stat pill (`.stat-pill`, FR-3) and theme toggle (FR-4).
- Acceptance: at mobile (375px), center nav is hidden, only logo + theme toggle visible. Header is non-interactive behind the bar — pointer events pass through to the content beneath the blurred background.

**FR-3 — GitHub Live Counter Pill [MOCKUP-EXACT]**
- Traceability: mockup lines 601–608, 1144–1210.
- A pill (`.stat-pill`) containing a pulsing green dot (`.stat-dot`), a star icon, the live star count (`#ghStars`), a separator dot, a fork icon, the live fork count (`#ghForks`).
- On mount: fetch `https://api.github.com/repos/tailwindlabs/tailwindcss` with an `AbortController` timeout of 4s. If `ok`, animate from `el.dataset.raw` to `data.stargazers_count` / `data.forks_count` over 1400ms with cubic ease-out. If not `ok` or aborted, fall back to `82400` stars and `4180` forks and animate those in (so the user never sees "—").
- Every 9 seconds, with probability 0.35, increment the star count by 1, re-render, and trigger the `.flash-up` animation (translateY -6px, color shift to `--accent-2`, text-shadow glow). This simulates live activity.
- Acceptance: pill renders correctly in all three themes. Number formatting: `≥1M → "X.XM"`, `≥1k → "X.Xk"`, else `toString()`. Network failure does not crash the page.

**FR-4 — Three-State Theme Toggle [MOCKUP-EXACT]**
- Traceability: mockup lines 610–614, 1078–1104.
- A pill group (`.theme-toggle`) with three buttons: `dark` (moon icon), `light` (sun icon), `cyber` (terminal icon).
- Active button: background `var(--accent)`, color `var(--bg)`, box-shadow `0 0 14px rgba(var(--accent-rgb), 0.5)`.
- Click → set `data-theme` on `<html>`, persist to `localStorage['devlog-theme']`, briefly add `.theme-anim` to `<body>` for 700ms to animate transitions.
- Initial theme: read from `localStorage` if present and valid; otherwise default to `dark`.
- Keyboard shortcut: `T` (case-insensitive) cycles `dark → light → cyber → dark`. Does NOT fire when focus is in an `<input>` or `<textarea>`.
- Acceptance: theme persists across reloads. SSR-rendered HTML must match the client's chosen theme to avoid a flash (the server reads the `devlog-theme` cookie set by a tiny inline script in `<head>`).
- **Implementation note:** the mockup's localStorage approach causes a hydration mismatch in Next.js SSR. We must replace it with a cookie-based approach (`document.cookie = 'devlog-theme=dark'`) read by the server so SSR emits the correct `data-theme` attribute.

**FR-5 — Hero Section [MOCKUP-EXACT]**
- Traceability: mockup lines 619–690.
- Section `#hero`, `min-height: 100vh`, `.bg-grid` background (56px grid lines using `var(--border)`), padding-top 24 to clear the fixed header.
- Two floating blurred dots (`.float-dot`): one 500×500 amber top-left, one 600×600 cyan bottom-right, both `filter: blur(60px); opacity: 0.25; animation: drift 16s ease-in-out infinite` with the cyan dot delayed -5s.
- A `mouse-glow` div (700×700 radial-gradient amber, blur 30px, opacity 0 → 1 on `mousemove` inside hero, 0 on `mouseleave`). Translates to mouse position.
- Issue meta row: tag `Issue 042`, date "November 12, 2024", pulsing dot + "currently publishing". All monospace 12px, muted color.
- Headline: `<h1>` with font-size `clamp(2.5rem, 7.5vw, 6.5rem)`, JetBrains Mono, bold, letter-spacing -0.045em, line-height 1.02. Content: `<span class="text-muted">$</span> <span id="typewriter" class="cursor"></span>`. The typewriter (FR-6) cycles through greetings.
- Subtitle: italic Fraunces `text-2xl md:text-3xl`, line-height 1.3: "Notes from a programmer's desk — on code, systems, and the strange joy of debugging at 2am."
- Body paragraph: "I'm **Alex Rivera** — software engineer writing about the craft. TypeScript today, Rust tomorrow, assembly for fun. New essay every other Tuesday."
- CTA row: `.btn-primary` "read latest →" (`#notes`), `.btn-secondary` "rss subscribe" (`#about`).
- Stats grid (`grid-cols-2 md:grid-cols-4`): `142 essays published`, `8.2k regular readers`, `2d since last commit`, `∞ cups of coffee`. Numbers in amber JetBrains Mono `text-3xl md:text-4xl`. Labels in muted mono `text-xs uppercase tracking-widest`.
- Scroll cue at the bottom-center: `tracking-widest uppercase` "scroll" text above a 30px vertical gradient bar.
- Acceptance: hero is ≥ 100vh on all breakpoints. Background grid parallax: `background-position: center ${scrolled * 0.3}px` while `scrollY < innerHeight`. Marquee (FR-7) appears immediately after hero.

**FR-6 — Hero Typewriter [MOCKUP-EXACT]**
- Traceability: mockup lines 1030–1065 (`greetings`, `tick()`).
- Cycles through five greetings:
  1. `hello, traveler.`
  2. `you found /dev/log.`
  3. `i write bugs so you don't have to.`
  4. `console.log('welcome back.');`
  5. `0x72656164657220313a20666f756e642e` (hex for "reader 1: found.")
- Type speed: 75 ± 50ms per character (random jitter). Delete speed: 35ms per character. Pause at full word: 2200ms. Pause when word is empty (before advancing): 400ms.
- The `#typewriter` span has a `.cursor::after` pseudo with content `'▌'` in `var(--accent)` that blinks (`animation: blink 1s steps(1) infinite`).
- Acceptance: typewriter does not run when `prefers-reduced-motion: reduce` — instead, it shows the first greeting statically. Typewriter pauses (but does not lose state) when the tab is hidden (Page Visibility API).

**FR-7 — Technology Marquee [MOCKUP-EXACT]**
- Traceability: mockup lines 692–698.
- A horizontal strip `py-5 border-y` between hero and recent notes. Background `var(--bg-elev)`, border-color `var(--border)`.
- Content: an inline-flex marquee (`animation: scroll 40s linear infinite; gap: 60px`) of technologies: `JavaScript · TypeScript · Rust · Go · WebAssembly · PostgreSQL · Redis · Docker · Kubernetes · Linux · NeoVim ·`. The list is duplicated twice (so the scroll is seamless — translateX 0 → -50%).
- Acceptance: marquee is full-width on all breakpoints. Pauses on `prefers-reduced-motion`.

**FR-8 — Recent Notes Section (`#notes`) [MOCKUP-EXACT]**
- Traceability: mockup lines 700–772.
- `py-24 md:py-32 px-6`. Max-width `7xl`, centered.
- Header row: left has `// recent notes` mono accent label + `Latest <em italic>writing</em>` Fraunces black 5xl/7xl headline (letter-spacing -0.035em). Right has `.btn-secondary` "all posts →" linking to `#archive`.
- Three article cards in a `grid md:grid-cols-3 gap-6`:
  1. Card 01 — tag `JavaScript`, date `11.12.24 — 8 min read`, title "On the Quiet Violence of Implicit Conversions", excerpt about `[] + {}`.
  2. Card 02 — tag `Compilers`, `10.28.24 — 14 min read`, "A Lexer, By Hand, On a Sunday Afternoon".
  3. Card 03 — tag `Error Handling`, `10.14.24 — 6 min read`, "Why I Removed Every Try/Catch From My Codebase".
- Card structure: `.article-card` with `28px padding`, `1px var(--border)`, `4px radius`, large `.card-num` (56px JetBrains Mono bold, amber, opacity 0.18 → 0.45 on hover), `.tag`, date, title (`text-2xl` Fraunces bold), excerpt (`text-sm muted`), and "read essay →" CTA at the bottom.
- Hover effect: `translateY(-8px)`, border-color strengthens, box-shadow `0 24px 48px -20px rgba(0,0,0,0.45)` (light theme: `rgba(26,22,16,0.2)`). The top-border gradient `linear-gradient(90deg, var(--accent), var(--accent-2))` scales from 0 to 1. The arrow shifts +8px.
- Acceptance: cards data is fetched from the database (`posts` table, `publishedAt IS NOT NULL ORDER BY publishedAt DESC LIMIT 3`) — but if the database is empty (first deploy, no posts), the cards fall back to the three mockup cards verbatim. This guarantees the landing page never looks broken.

**FR-9 — Snippet of the Week (`#snippets`) [MOCKUP-EXACT]**
- Traceability: mockup lines 774–882.
- `py-24 md:py-32 px-6`, background `var(--bg-elev)`.
- Two-column grid (`lg:grid-cols-12`): left col-span-4 sticky (`top: 120px`), right col-span-8.
- Left: `// snippet of the week` label, headline `useTypewriter() — the hook powering this hero.` (italic Fraunces 4xl/5xl), explanation paragraph, three bullet points (`→ zero dependencies`, `→ ~30 lines, fully typed`, `→ cleanup-safe on unmount`), and three tags (`React`, `TypeScript`, `Hooks`).
- Right: two `.code-window` cards stacked. Each has a `.code-header` (macOS traffic-light dots + filename) and a copy button. The pre-formatted code block has syntax-highlighted spans (`.tk-key`, `.tk-str`, `.tk-fn`, `.tk-com`, `.tk-num`, `.tk-op`, `.tk-var`).
- The first code window shows the `useTypewriter` hook source (30 lines, react import, the effect, the cleanup). The second shows a `Hero()` usage example.
- Copy button behavior (FR-10): on click, write `codeEl.innerText` to clipboard, swap label `copy → copied`, swap icon `fa-copy → fa-check` for 1800ms, then revert.
- Acceptance: code rendering uses a real syntax highlighter (Shiki with the GitHub-dark theme tokens mapped to our CSS classes) so future snippets can be added without hand-writing span classes. The highlighted code is rendered server-side; the copy button reads from the rendered `<code>` element's `innerText`.

**FR-10 — Copy-to-Clipboard for Code**
- Traceability: mockup lines 1106–1142.
- All `.copy-btn` elements wire up `navigator.clipboard.writeText(codeEl.innerText)` on click. If `navigator.clipboard` is unavailable (HTTP context, older Safari), fall back to the `document.execCommand('copy')` path with a temporary hidden `<textarea>`.
- Visual feedback: button gets `.copied` class (accent background, accent text), label swaps to `copied`, icon swaps to `fa-check`. Reverts after 1800ms.
- Acceptance: copy works on HTTP, HTTPS, and in the jsdom test environment (mocked clipboard).

**FR-11 — Archive Section (`#archive`) [MOCKUP-EXACT, with DB pagination]**
- Traceability: mockup lines 884–966.
- `py-24 md:py-32 px-6`, max-width `5xl`, centered.
- Header: `// the archive` + `Older <em italic>posts</em>` headline + paragraph "142 essays on programming, written over four years. Filtered here by recency — the full index lives in the JSON."
- Six `.archive-item` rows: each has a date column (mono 12px, fixed width 24/96px), a title column (Fraunces 700, 20/24px) with a one-line excerpt (muted), a tag column (hidden on mobile), and a read-time column (mono, right-aligned).
- Hover effect: row shifts 16px right, bottom-border becomes accent, a small accent dot appears at the left.
- Footer button: `.btn-secondary` "browse all 142 essays →".
- v1 Acceptance: items come from the database (`posts` table, paginated — first 6 visible on landing, full archive at `/archive`). If the database is empty, fall back to the six mockup items verbatim.
- v2 Acceptance: `/archive` page supports `?tag=JavaScript` filter, `?page=2` pagination, and `?q=lexer` full-text search (SQLite FTS5).

**FR-12 — Subscribe Section (`#about`) [MOCKUP-EXACT, with real email]**
- Traceability: mockup lines 968–1008, 1237–1251.
- `py-24 md:py-32 px-6`, background `var(--bg-elev)`, max-width `4xl`, centered.
- Header: `// stay in the loop` + `Every other <em italic>Tuesday.</em>` + paragraph "One essay. No tracking, no ads, no '10x' anything. Unsubscribe with a single click — I won't even be offended."
- Form: an email `<input type="email" placeholder="you@somewhere.dev" required>` + `.btn-primary` submit button "subscribe →".
- On submit: `e.preventDefault()`, validate `value.includes('@')`, then call the Server Action `subscribeToNewsletter(email)`.
- The Server Action: Zod-validates the email, checks it's not already in the `subscribers` table, inserts a row with `status: 'pending'`, sends a Resend transactional email (`react-email` template `ConfirmEmail`) with a signed confirmation link (`/api/confirm?token=...`), returns `{ ok: true }`.
- On success: show the `#subToast` (font-mono, accent color, "✓ welcome aboard. confirmation pending in your inbox."), fade opacity 0 → 1, clear input, swap placeholder to "see you Tuesday." for 4 seconds, then revert.
- On error (rate limit, duplicate, Resend 4xx): show inline error message under the input.
- Three-trust-block grid below: `No spam`, `No tracking`, `No paywall` — each with a bold accent header and a one-line muted explanation.
- Acceptance: form is fully keyboard-operable. Email is validated both client-side and server-side. Resend failure does not expose internals (generic "Something went wrong. Try again in a moment." message).

**FR-13 — Footer [MOCKUP-EXACT]**
- Traceability: mockup lines 1010–1028.
- `py-12 px-6 border-t` with `border-color: var(--border)`.
- Left: `© 2024 Alex Rivera · built with care, not frameworks` (mono 14px muted).
- Right: four `.hover-link` icons (`fab fa-github`, `fab fa-x-twitter`, `fas fa-rss`, `fas fa-envelope`). Each in a 1.25rem font.
- Center divider: `border-top: 1px solid var(--border)`, padding-top 8, mono 12px muted: `<span style="color:accent">$</span> echo "thanks for reading" | sudo tee /dev/stdout`.
- Acceptance: all external links have `rel="noopener noreferrer"` and `target="_blank"`. The mailto link uses `hi@devlog.example` (configurable via `NEXT_PUBLIC_AUTHOR_EMAIL`).

**FR-14 — Keyboard Shortcut: T to Cycle Theme**
- Traceability: mockup lines 1253–1262.
- On `keydown` of `t` or `T`: if `e.target.tagName` is not `INPUT` or `TEXTAREA`, cycle to the next theme in `[dark, light, cyber]`.
- Acceptance: works on the entire page (not just when the toggle is focused). Does not interfere with form input.

**FR-15 — Scroll Reveal Animations**
- Traceability: mockup lines 1226–1235, 537–546.
- All elements with class `.reveal` start with `opacity: 0; transform: translateY(30px)`. An `IntersectionObserver` (`threshold: 0.12, rootMargin: '0px 0px -80px 0px'`) toggles `.visible` on intersection. Once visible, the observer `unobserve`s the element.
- Acceptance: `prefers-reduced-motion: reduce` → elements are immediately visible (no transition). Reveal does not cause layout shift (CLS ≤ 0.05).

**FR-16 — Background Grid Parallax (Hero only)**
- Traceability: mockup lines 1264–1271.
- On `scroll` (passive listener): if `scrollY < innerHeight`, set `heroGrid.style.backgroundPosition = 'center ' + (scrolled * 0.3) + 'px'`.
- Acceptance: parallax is smooth (no jank on a 60fps scroll). Disabled on `prefers-reduced-motion`.

### 4.2 Blog Pages

**FR-20 — `/archive` — Full Archive Page**
- A paginated list of all published posts. URL: `/archive`, `/archive/page/2`, `/archive?tag=JavaScript`, `/archive?q=lexer`.
- Each row mirrors the landing archive-item structure. Pagination controls at the bottom (Prev / Page N / Next).
- Empty state: "No essays match. Try a different filter, or browse the archive from the top."
- Acceptance: pagination is `<a>` links (SEO-crawlable). Tag filter is a `<select>` that submits on change (with `<noscript>` fallback to a submit button). Total pages calculated from `COUNT(*)` over filtered `posts`.

**FR-21 — `/posts/[slug]` — Individual Essay Page**
- Renders an MDX post. URL: `/posts/on-the-quiet-violence-of-implicit-conversions`.
- Layout: centered prose, max-width `prose-lg`, Fraunces body, 1.7 line-height.
- Top meta: tag, date, read-time (computed from word count — 200 wpm).
- Bottom: author bio box (Alex Rivera avatar + 2-line bio + social links), subscribe CTA, prev/next post links.
- Acceptance: MDX components are mapped through `next-mdx-remote` or `@next/mdx`. Code blocks render with Shiki. Images use `next/image`. Headings get auto-anchor IDs.

**FR-22 — `/snippets` — Snippet Library**
- A list of code snippets, each rendered with the `.code-window` pattern.
- URL: `/snippets`, `/snippets/[slug]`.
- Each snippet has a title, language, tags, source code, and a copy button.
- Acceptance: snippets are MDX files under `content/snippets/`. The list is statically generated at build time.

**FR-23 — `/rss.xml` — RSS Feed**
- Traceability: implied by the footer RSS link.
- Generates an RSS 2.0 feed of the 20 most recent posts. Title: `/dev/log`, description: "Notes from a programmer's desk", link: `https://devlog.example`.
- Acceptance: feed is at `/rss.xml`, has correct `Content-Type: application/rss+xml; charset=utf-8`, and validates at https://validator.w3.org/feed/.

**FR-24 — `/sitemap.xml` and `/robots.txt`**
- `sitemap.xml` lists all published posts, archive pages, and the landing page. `lastmod` is the post's `updatedAt`.
- `robots.txt` allows all, points to sitemap.
- Acceptance: both are statically generated at build time via Next.js metadata routes.

### 4.3 Authentication & Subscriber Flow

**FR-30 — Subscribe Flow (already in FR-12)**
- Email input → Zod validate → DB insert (status: pending) → Resend confirmation email → user clicks signed link → `/api/confirm?token=...` → updates row to `status: 'confirmed'`.

**FR-31 — Unsubscribe Flow**
- Every email sent includes an unsubscribe link `/unsubscribe?token=...` (signed).
- Visiting the link sets `subscribers.status = 'unsubscribed'` and shows a friendly confirmation page.
- Acceptance: link expires after 30 days. Re-using an expired link shows "This unsubscribe link has expired. Manage your subscription at /preferences."

**FR-32 — Subscriber Preferences (`/preferences`)**
- Subscribers can update their email, change frequency (weekly / monthly), or unsubscribe.
- Auth: signed token in URL (no password). Token rotates on email change.
- Acceptance: changes are persisted; user sees a toast on save.

**FR-33 — Admin Auth (`/admin/*`)**
- Author login at `/admin/login` (email + password, Better Auth).
- All `/admin/*` routes (except `/admin/login`) require an authenticated session with role `author`.
- Acceptance: failed login is rate-limited (5 attempts per 10 minutes per IP). Successful login sets a 30-day session cookie.

### 4.4 Admin Surface

**FR-40 — `/admin` — Dashboard**
- Stats: total subscribers (confirmed / pending / unsubscribed), total posts (published / draft), total comments (pending / approved / spam), GitHub stars (cached).
- Quick actions: "New post" (link to FR-41), "Moderate comments" (link to FR-43).
- Acceptance: dashboard loads in under 800ms server-side (single DB query per stat).

**FR-41 — `/admin/posts` and `/admin/posts/new`**
- Posts list with edit/delete actions.
- New post: a form with `title`, `slug` (auto-derived, editable), `excerpt`, `tags[]`, `publishedAt` (or "Save as draft"), and an MDX content editor (CodeMirror 6 with markdown+mdx language support).
- Acceptance: post creation is a Server Action with Zod validation. Slug must be unique. MDX is validated (parse error → user-facing error).

**FR-42 — `/admin/subscribers`**
- List of subscribers with status filter, search, and CSV export.
- Acceptance: CSV export streams and has correct `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="subscribers-YYYY-MM-DD.csv"`.

**FR-43 — `/admin/comments`**
- Comments awaiting moderation. Approve / spam / delete actions.
- Acceptance: actions are Server Mutations; UI updates via `revalidatePath('/posts/[slug]')`.

**FR-44 — `/admin/settings`**
- Site-wide settings: author name, bio, avatar URL, social links, default SEO description.
- Stored in a `site_settings` table (single row, ID = 1).
- Acceptance: changes are reflected on next page render via ISR revalidation.

### 4.5 Email (Resend)

**FR-50 — Confirmation Email (`ConfirmEmail`)**
- React Email template: monospace, dark theme matching the site, greeting, "Confirm your subscription to /dev/log", button linking to `/api/confirm?token=...`, plain-text fallback, unsubscribe footer.
- Sent via Resend API: `POST https://api.resend.com/emails` with `from: /dev/log <noreply@devlog.example>`, `to: <email>`, `subject: confirm your subscription`, `html: rendered`, `text: rendered`.
- Acceptance: from-address is on a verified Resend domain (`devlog.example` or `onboarding@resend.dev` for dev). Failure path: log to server console, return generic error to user, do not crash.

**FR-51 — New Essay Email (`NewEssayEmail`)**
- Sent to all `status: 'confirmed'` subscribers when a post's `publishedAt` transitions from `null` to a date.
- Subject: `${post.title}`. Body: post excerpt + "Read on /dev/log" button linking to `/posts/[slug]`.
- Rate-limited: Resend allows 100 emails/sec on the dev tier; we batch in chunks of 100 with a 1-second delay between batches. Total send time for 1000 subscribers: ~10s.
- Acceptance: a single failed recipient does not abort the batch. Bounces update `subscribers.status` to `bounced`.

### 4.6 Comments (Optional v1.5, default off)

**FR-60 — Inline Comments**
- Authenticated subscribers can leave a comment on `/posts/[slug]`. Comments nest one level. New comments are `status: 'pending'` until moderated.
- Acceptance: rate-limited to 3 comments per post per subscriber per hour. Akismet integration optional.

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Metric | Target | How Measured |
|--------|--------|--------------|
| LCP (landing) | ≤ 1.2s on desktop, ≤ 2.0s on 4G mobile | Lighthouse, Core Web Vitals |
| INP (interaction) | ≤ 100ms | Lighthouse |
| CLS | ≤ 0.05 | Lighthouse |
| TTFB | ≤ 200ms (edge) / ≤ 400ms (origin) | Lighthouse |
| Landing page weight | ≤ 200KB initial JS (gzip) | Bundle analyzer |
| Landing page weight | ≤ 80KB CSS (gzip) | Network tab |
| Font weight | ≤ 250KB total (Fraunces subset + JetBrains Mono subset + Space Grotesk subset) | next/font report |
| Image weight | ≤ 100KB per image, served via `next/image` AVIF/WebP | Lighthouse |
| API `/api/github-stats` | ≤ 200ms p95 (cached 60s) | Server timing |
| Subscribe action | ≤ 800ms p95 (includes Resend call) | Server timing |

### 5.2 Accessibility

- WCAG 2.2 Level AA as a baseline. AAA where the design system allows (typography contrast on body text already exceeds 7:1).
- All interactive elements keyboard-operable. Visible focus states (`:focus-visible` style: 2px accent outline + 2px offset).
- All form fields have associated `<label>` elements.
- Color is never the sole indicator of state (the GitHub stat pill uses both color and shape — the dot pulses regardless of theme).
- Skip-to-content link as the first focusable element on every page.
- ARIA live regions for: subscribe toast, copy-to-clipboard confirmation, GitHub counter live updates (polite).
- `prefers-reduced-motion: reduce` respected everywhere (all animations and parallax disabled).
- `aria-label` on all icon-only buttons (theme toggle, copy, social icons).
- Semantic HTML throughout: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`.
- HTML lang attribute set (`<html lang="en">`).

### 5.3 SEO

- Every page has a `<title>`, `<meta name="description">`, and Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`).
- Twitter Card tags (`twitter:card=summary_large_image`).
- JSON-LD on every post: `Article` schema with author, datePublished, headline, image.
- JSON-LD on landing: `WebSite` schema with potential action `SearchAction` (when search is implemented).
- Canonical URLs on all pages.
- Sitemap and robots.txt (FR-24).
- All internal links are `<a>` (not `<button>` with onClick) for crawlability.

### 5.4 Security

- **Authentication:** Better Auth with email/password. Passwords hashed with scrypt (Better Auth default). Session cookie `HttpOnly; Secure; SameSite=Lax`.
- **Authorization:** Server Actions check `session.user.role === 'author'` for any admin mutation. Public mutations (subscribe, comment) check rate limits.
- **Input validation:** Zod on every Server Action input and every Route Handler body. No `any` types in input paths.
- **SQL injection:** Drizzle ORM parameterized queries only. No raw `db.run(sqlString)`.
- **XSS:** MDX content rendered with `next-mdx-remote`'s safe defaults — no `allowDangerousHtml`. Code blocks rendered via Shiki (escaped output). User-submitted comments rendered as plain text or with a strict allowlist (no `<script>`, no `on*` attributes).
- **CSRF:** Server Actions use Next.js's built-in CSRF token (Origin/Host header check).
- **Rate limiting:** In-memory rate limiter for v1 (per-IP, sliding window). Newsletter subscribe: 3 per hour per IP. Admin login: 5 per 10 minutes per IP. Comments: 3 per post per subscriber per hour. (v2: move to Upstash Redis.)
- **Secrets:** No secrets in code. `.env.local` is gitignored. `.env.example` lists required keys. Production secrets via deployment environment.
- **Headers:** `Content-Security-Policy` (script-src 'self' 'unsafe-inline' for Next.js inline scripts; style-src 'self' 'unsafe-inline'); `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- **Dependency hygiene:** `pnpm audit` runs in CI. No critical vulnerabilities allowed.
- **Logging:** Never log secrets, email bodies, full emails (mask to `a***@example.com`), or session tokens.

### 5.5 Reliability

- Subscribe flow degrades gracefully if Resend is down: insert subscriber as `pending`, schedule retry (Next.js `unstable_after` or a `setTimeout` in dev), show user the success toast (the confirmation email will arrive later).
- GitHub API down: fall back to cached numbers, do not crash the landing page.
- better-sqlite3 read errors: fall back to mockup data for the landing page (graceful degradation).
- 404 page: branded, with the `$ command not found: <url>` logotype and a link back to `/`.
- 500 page: branded, with `$ segmentation fault (core dumped)` logotype and a "back to safety" CTA.

### 5.6 Browser Support

- Evergreen browsers: latest Chrome, Firefox, Safari, Edge (2 versions back).
- Safari iOS ≥ 15.
- No IE11. No Opera Mini.
- JavaScript optional: every page renders server-side and is readable without JS. Interactivity (theme toggle, typewriter, copy button, subscribe form) is progressive enhancement. The site works on `curl`.

### 5.7 Internationalization

- v1 is English-only. Strings live in `src/lib/i18n/en.ts`. v2 may add Japanese (the cyber theme's CRT aesthetic leans Japanese).

---

## 6. Tech Stack & Tooling

### 6.1 Definitive Tech Stack

| Layer | Technology | Version | Rationale |
|-------|------------|---------|-----------|
| Package manager | pnpm | ≥9.15 (latest 9.x) | Strict node_modules, fast install, monorepo workspaces support, used by all reference skills. |
| Monorepo orchestrator | Turborepo | ≥2.4 (latest 2.x) | Cached task execution, dependency-aware task graph, used by all Next.js 16 reference skills. |
| Web framework | Next.js | 16.x (latest 16, currently 16.2) | App Router, Server Components, Server Actions, on-demand ISR, partial prerendering, required by mockup interactivity (theme toggle, typewriter, copy). |
| UI runtime | React | 19.x (latest 19, currently 19.2) | Required by Next.js 16. `use()`, `useFormState`, `useOptimistic` for the subscribe form. |
| Language | TypeScript | 5.9.x | Strict mode, `unknown` over `any`, satisfies operator, `erasableSyntaxOnly` (Next.js 16 enforces). |
| CSS framework | Tailwind CSS | v4.x (4.1+) | CSS-first `@theme` block, container queries, modern engine, required by mockup design tokens (CSS variables in `:root`). |
| Component library | shadcn/ui | latest (CLI-managed) | Copy-paste components we can customize (button, input, dialog, dropdown-menu, command, toast). |
| PostCSS | PostCSS | 8.x | Required by Tailwind v4 (`@tailwindcss/postcss`). |
| ORM | drizzle-orm | latest 0.40+ | Type-safe SQL query builder, works natively with better-sqlite3, no codegen round-trip needed. |
| Database driver | better-sqlite3 | latest 12.x | Synchronous, fast, file-based SQLite. Perfect for a single-server blog. No external DB process. |
| Auth | Better Auth | latest 1.x | Email/password, session cookies, RBAC plugin for `author` role, plugin ecosystem (not Auth.js because we want simpler, not Magic Link). |
| Email | Resend | latest 4.x | React Email integration, generous free tier (100/day), good DX. |
| Form validation | Zod | latest 3.x (or 4.x when stable) | Both client and server validation, types inferred from schemas. |
| State management | Zustand | latest 5.x | Client-side UI state (theme persistence fallback, mobile nav drawer). Server state is in the URL or via Server Components. |
| Linter | ESLint | 9.x (flat config) | Required by Next.js 16. `next/core-web-vitals`, `typescript-eslint`, `jsx-a11y`. |
| Code formatter | Prettier | latest 3.x | Used by all reference skills. Run via lint-staged. |
| Test runner | Vitest | latest 2.x | Fast, native ESM, Jest-compatible API. |
| Test environment | jsdom | latest 25.x | For component tests that need a DOM. |
| Syntax highlighter | Shiki | latest 1.x | Server-side, accurate highlighting, themeable. Used for code blocks and the snippet showcase. |
| MDX | @next/mdx + next-mdx-remote | latest | Authoring in MDX, custom component mapping. |
| Email templates | React Email | latest 3.x | Composable email templates rendered to HTML + plain text. |
| Markdown processing | remark/rehype plugins | latest | For read-time, auto-anchor IDs, smart quotes. |
| HTTP client | native `fetch` | built-in | No axios — Next.js 16 has `fetch` with caching/revalidation built in. |

### 6.2 Why These Choices

- **better-sqlite3 over Postgres / Neon:** The blog is a single-server write-light read-heavy workload. SQLite handles ~100K reads/sec on a single SSD. No external DB process to manage. Migrations are trivial. Backups are `cp devlog.db devlog.db.bak`. If the blog grows beyond SQLite's capacity, the migration to Postgres is mechanical (Drizzle supports both).
- **Better Auth over NextAuth / Auth.js:** Better Auth has a cleaner API for email/password (no OAuth complexity for v1), a sensible RBAC plugin for the `author` role, and is what the most-aligned reference skill (`nextjs16-react19-tailwind4-better-auth-monorepo`) uses. NextAuth v5's `auth.ts` middleware pattern is being deprecated in Next.js 16 in favor of `proxy.ts`; Better Auth already integrates with `proxy.ts`.
- **Resend over Postmark / SendGrid:** Resend has a generous free tier (100/day, 3000/month), a clean API, native React Email support, and is what the reference skill uses.
- **Zustand over Redux / Jotai:** The client-side state is minimal (theme fallback, mobile nav drawer, optimistic UI for subscribe). Zustand is the smallest mental model.
- **shadcn/ui over Material UI / Chakra:** shadcn is copy-paste, fully owned, and styled with Tailwind tokens. The mockup's design system (sharp corners, custom buttons, custom cards) requires owning the component source — shadcn delivers exactly that.
- **Turborepo over Nx:** Turborepo is simpler, has a smaller footprint, and is the standard for Next.js monorepos in 2026.
- **Vitest + jsdom over Jest:** Vitest is faster, has a Jest-compatible API, native ESM, and is what Next.js 16 documents as the default test runner.
- **No tRPC v11:** The API surface is small (subscribe, comment, GitHub stats). Server Actions + Route Handlers suffice. Adding tRPC would mean an extra abstraction layer with no payoff at this scale.

---

## 7. Commands

All commands run from the repo root via pnpm workspaces. The `pnpm` binary must be on PATH (v9.15+).

| Command | Where | Purpose |
|---------|-------|---------|
| `pnpm install` | root | Install all workspace dependencies. |
| `pnpm dev` | root | Start the Next.js dev server (`apps/web`) on `http://localhost:3000` with Turbopack. |
| `pnpm build` | root | Production build of all packages. Outputs `.next/` in `apps/web`. |
| `pnpm start` | root | Start the production server (after `pnpm build`) on `http://localhost:3000`. |
| `pnpm check-types` | root | Run `tsc --noEmit` across all packages. |
| `pnpm lint` | root | Run ESLint flat config across all packages. |
| `pnpm test` | root | Run Vitest in non-watch mode (CI mode). |
| `pnpm test:watch` | root | Run Vitest in watch mode. |
| `pnpm test:coverage` | root | Run Vitest with coverage report (`text`, `html`, `lcov`). |
| `pnpm format` | root | Run Prettier on the entire codebase. |
| `pnpm format:check` | root | Check formatting without writing. |
| `pnpm db:generate` | root | Generate Drizzle migration SQL from `packages/db/src/schema.ts`. |
| `pnpm db:migrate` | root | Apply migrations to `apps/web/devlog.db`. |
| `pnpm db:seed` | root | Seed the database with mockup data (3 posts, 6 archive items, 5 snippets, 1 author user). |
| `pnpm db:studio` | root | Open Drizzle Studio at `https://local.drizzle.studio`. |
| `pnpm clean` | root | Remove `node_modules`, `.next`, `dist`, `.turbo`, `coverage` across the repo. |
| `pnpm check` | root | Run `check-types`, `lint`, `test`, `build` in sequence — the pre-commit / pre-push gate. |

---

## 8. High-Level Project Structure

The detailed directory tree lives in the PAD. The high-level shape is:

```
programmer-blog/
├── apps/
│   └── web/                         # The Next.js 16 app
│       ├── src/
│       │   ├── app/                  # App Router (routes, layouts, error pages)
│       │   ├── features/             # Feature-sliced modules (landing, blog, admin, auth)
│       │   ├── domain/               # Domain types & pure business logic
│       │   ├── lib/                  # Infrastructure (db, auth, email, github, rate-limit)
│       │   ├── components/           # Shared UI primitives (shadcn + custom)
│       │   ├── hooks/                # Custom React hooks (useTypewriter, useTheme, etc.)
│       │   └── styles/               # globals.css with @theme block
│       ├── content/                  # MDX essays and snippets
│       ├── public/                   # Static assets (favicon, og images, fonts)
│       ├── drizzle.config.ts
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── package.json
├── packages/
│   ├── db/                           # Drizzle schema, migrations, client
│   ├── auth/                         # Better Auth instance and server utilities
│   ├── email/                        # React Email templates + Resend client
│   ├── ui/                           # shadcn/ui primitives shared across apps (future)
│   ├── config/                       # Shared ESLint, TS, Tailwind config bases
│   └── types/                        # Shared Zod schemas and TS types
├── docs/                             # Project docs (PRD, PAD, MEP, ssh key, prompts)
├── skills/                           # Reference skills (existing, do not modify)
├── landing_page_mockup.html          # The reference mockup (do not delete)
├── package.json                      # Root workspace manifest
├── pnpm-workspace.yaml               # Workspace definition
├── turbo.json                        # Turborepo task graph
├── tsconfig.base.json                # Shared TS compiler options
├── .env.example                      # Documented env vars
├── .gitignore
└── README.md
```

The structure follows the **5-layer golden rule** from the nextjs16-react19 reference skills:
1. `proxy` (Next.js 16 replaces `middleware.ts` with `proxy.ts`) — edge-level concerns: auth redirect, rate-limit headers.
2. `app` — route handlers, layouts, pages. Stays thin.
3. `features` — feature-sliced modules, each owns its UI, queries, mutations.
4. `domain` — pure types and logic, no IO.
5. `lib` — infrastructure adapters (db, auth, email, github, rate-limit, redis-client stub).

---

## 9. Code Style

### 9.1 TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `erasableSyntaxOnly: true` (Next.js 16 enforces), `verbatimModuleSyntax: false` (so `import type` is not required).
- No `any`. Use `unknown` for untrusted input; narrow with Zod.
- Prefer `interface` for object shapes; `type` for unions/intersections.
- Early returns. Avoid `else` after `return`.
- Async functions explicitly typed return `Promise<T>` (inference fails for Server Actions in some Next.js versions).
- Naming: `camelCase` for variables/functions, `PascalCase` for types/components/Zod schemas, `SCREAMING_SNAKE_CASE` for env-only constants, `kebab-case` for file names of non-component modules, `PascalCase.tsx` for component files.

### 9.2 React / Next.js

- Default to Server Components. Add `"use client"` only when state, effects, or browser-only APIs are required.
- Server Actions for mutations. Never `fetch('/api/...')` from a client component when a Server Action works.
- `async` params in dynamic routes: `async function Page({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; ... }` (Next.js 16 makes params a Promise).
- Streams with `<Suspense>` boundaries around any async child.
- Images via `next/image` always. No `<img>` except in MDX where a custom `Image` component wraps `next/image`.
- Fonts via `next/font/local`. No Google Fonts `<link>` in production.
- Metadata via the `metadata` export (or `generateMetadata` for dynamic pages).

### 9.3 CSS / Tailwind v4

- CSS-first `@theme` block in `apps/web/src/styles/globals.css` defines all design tokens (color, font, spacing, radius, shadow) — no `tailwind.config.ts`.
- Semantic color tokens only: `--color-bg`, `--color-bg-elev`, `--color-fg`, `--color-fg-dim`, `--color-muted`, `--color-accent`, `--color-accent-2`, `--color-border`, `--color-card`, `--color-code-bg`, `--color-code-fg`, `--color-glow`. The three themes (`dark`, `light`, `cyber`) are `[data-theme="..."]` overrides on `:root`.
- Utility classes for the mockup's custom components (`.btn-primary`, `.btn-secondary`, `.article-card`, `.code-window`, `.tag`, `.stat-pill`, `.hover-link`, `.theme-toggle`, `.input-field`, `.archive-item`, `.reveal`, `.bg-grid`, `.float-dot`, `.mouse-glow`, `.marquee`, `.progress-bar`, `.cursor`, `.logo-cursor`) are defined in `globals.css` under `@layer components`, using the semantic tokens. This is non-negotiable — they must match the mockup's CSS verbatim.
- No `!important` except where the mockup uses it (the `theme-anim` transition rule).
- Mobile-first. `md:` and `lg:` breakpoints only (no `sm:` or `xl:` in the mockup; mirror that).
- `prefers-reduced-motion: reduce` block at the end of `globals.css` zeroes all animation/transition durations.

### 9.4 Drizzle

- Schema in `packages/db/src/schema.ts`. One file, all tables. Use `sqliteTable`.
- Migrations in `packages/db/migrations/`. Generated by `pnpm db:generate`. Applied by `pnpm db:migrate`.
- Client in `packages/db/src/client.ts`. Singleton — guarded against hot-reload creating multiple connections in dev.
- Transactions for any multi-write operation.
- `db.select().from(posts).where(eq(posts.slug, slug)).limit(1)` — never raw SQL.

### 9.5 Tests

- Collocated with source: `useTypewriter.ts` → `useTypewriter.test.ts` adjacent.
- AAA pattern (Arrange, Act, Assert). One assertion per test where possible.
- Vitest + jsdom for component and hook tests.
- Mock the database in unit tests; use a real in-memory `:memory:` SQLite for integration tests.
- Coverage thresholds (enforced in CI): `statements: 80`, `branches: 75`, `functions: 80`, `lines: 80`. Below = fail.

### 9.6 Git

- Trunk-based. All commits to `main`.
- Commit message format: `<type>(<scope>): <subject>` where type ∈ `{feat, fix, refactor, test, docs, chore, perf, style, build, ci}` and scope is the package or feature affected.
- Atomic commits. One logical change per commit. The MEP ties each implementation step to a commit.
- Conventional footer: `Refs: <PRD-FR-N>` when a commit implements a specific functional requirement.

---

## 10. Testing Strategy

### 10.1 Test Pyramid

| Layer | Framework | Location | Coverage Target |
|-------|-----------|----------|-----------------|
| Unit (pure functions, hooks, domain logic) | Vitest | `*.test.ts(x)` adjacent to source | 85% |
| Component (React rendering, user interaction) | Vitest + jsdom + @testing-library/react | `*.test.tsx` adjacent | 75% |
| Integration (DB, auth, email — with real adapters against in-memory/fake) | Vitest | `*.integration.test.ts` | 70% |
| Route (Next.js Route Handlers, Server Actions, with mocked DB) | Vitest + jsdom | `*.route.test.ts` | 70% |
| E2E (full browser) | Vitest + Playwright (deferred to v1.5) | `e2e/*.spec.ts` | smoke tests only |

### 10.2 What We Test

- **Hooks:** `useTypewriter` (cycles through greetings, respects reduced motion, pauses on hidden tab), `useTheme` (cycles, persists, no hydration mismatch), `useScrollProgress` (0% at top, 100% at bottom), `useReveal` (IntersectionObserver toggling), `useCopyToClipboard` (clipboard + fallback).
- **Domain logic:** `formatNumber` (mockup lines 1148–1152), `calculateReadTime` (word count / 200), `slugify` (lowercase, hyphenated, ASCII-folded), `validateEmail` (Zod), `generateSignedToken` / `verifySignedToken` (HMAC).
- **Server Actions:** `subscribeToNewsletter` (happy path, duplicate email, invalid email, Resend failure, rate limit), `confirmSubscription` (valid token, expired token, already confirmed), `createPost` (valid, slug collision, invalid MDX), `moderateComment` (approve, spam, delete).
- **Routes:** `GET /api/github-stats` (200 with body, 200 with cached fallback on rate limit, 500 handled), `GET /rss.xml` (valid XML, includes latest 20), `GET /sitemap.xml` (valid XML, includes all posts).
- **Components:** every shadcn-derived primitive + every custom component (`ArticleCard`, `CodeWindow`, `CopyButton`, `ThemeToggle`, `StatPill`, `ArchiveItem`, `SubscribeForm`, `Hero`, `Marquee`, `Footer`, `Nav`).
- **Pages:** smoke render test for `/`, `/archive`, `/posts/[slug]`, `/snippets`, `/admin`, `/admin/login`, `/admin/posts`, `/admin/subscribers`, `/admin/comments`, `/admin/settings`, `/404`, `/500`.

### 10.3 What We Do NOT Test

- Third-party library internals (we trust Shiki, Drizzle, Better Auth, Resend SDK).
- Visual regressions pixel-by-pixel (deferred to Playwright visual snapshots in v1.5).
- SEO markup structure (manually verified once; not in CI).

### 10.4 CI Gates

A PR is mergeable only when all of these are green:

- `pnpm check-types` — 0 errors.
- `pnpm lint` — 0 errors. (Warnings allowed but not ignored.)
- `pnpm test` — 0 failures. Coverage thresholds met.
- `pnpm build` — succeeds for all 9 packages + Next.js standalone build.
- `pnpm audit --prod` — 0 critical vulnerabilities.

---

## 11. Boundaries — Always / Ask First / Never

### 11.1 Always

- Run `pnpm check-types && pnpm lint && pnpm test` before any commit.
- Validate all untrusted input with Zod before it touches the database.
- Use `next/image` for all images, `next/font` for all fonts, `next/link` for internal navigation.
- Add or update a test for any logic you write or modify.
- Document any architectural decision as an ADR in the PAD.
- Update the MEP checklist when a phase completes.
- Append to `worklog.md` when taking on a Task ID.
- Keep the three theme tokens (`dark`, `light`, `cyber`) in sync — any color change touches all three.

### 11.2 Ask First

- Adding a new dependency to any `package.json`.
- Changing the database schema (`packages/db/src/schema.ts`).
- Modifying `turbo.json` or the root `package.json` `scripts` block.
- Changing the Next.js version (major or minor).
- Adding a new environment variable to `.env.example`.
- Removing an existing test.
- Modifying the mockup HTML (the source of truth for the landing page).
- Changing the commit history (`git rebase`, `git reset --hard`) on `main`.

### 11.3 Never

- Commit secrets, API keys, or the actual Resend API key.
- Commit `node_modules`, `.next`, `dist`, `coverage`, `.turbo`, or the SQLite database file.
- Use `any`, `@ts-ignore`, `eslint-disable` without a justification comment.
- Disable lint rules or lower type strictness to make a build pass.
- Hand-write SQL strings; always use Drizzle's query builder.
- Use `dangerouslySetInnerHTML` on user-submitted content.
- Add OAuth providers without explicit user request (v1 is email/password only).
- Deploy to a platform that doesn't support Node.js 20+ and `better-sqlite3` native bindings.
- Edit the `skills/` folder — it is a reference, not part of the build.

---

## 12. Success Criteria & Acceptance Tests

### 12.1 Definition of Done (Engagement Level)

The engagement is complete when **all** of the following are true:

- [ ] The PRD, PAD, and MEP are committed to `main` and readable in GitHub's markdown renderer.
- [ ] The Next.js 16 monorepo is scaffolded with the structure in §8.
- [ ] `pnpm install` succeeds without errors or peer-dep warnings.
- [ ] `pnpm check-types` is green (0 errors) across all packages.
- [ ] `pnpm lint` is green (0 errors, warnings allowed but reviewed).
- [ ] `pnpm test` passes ≥ 80% coverage on statements, branches, functions, lines.
- [ ] `pnpm build` succeeds. `apps/web/.next/` contains a standalone server output.
- [ ] `pnpm start` serves the site on `localhost:3000`. The landing page renders indistinguishably from `landing_page_mockup.html` at 375px, 768px, and 1280px widths, in all three themes.
- [ ] The landing page passes Lighthouse with: Performance ≥ 95, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- [ ] All functional requirements FR-1 through FR-16, FR-20 through FR-24, FR-30 through FR-33, FR-40 through FR-44, FR-50 through FR-51 are implemented and have at least one passing test each.
- [ ] The MEP's every phase checklist is fully checked off.
- [ ] All work is committed to `main` with descriptive Conventional Commits messages, each tied to a FR or phase.
- [ ] The repository is pushed to `git@github.com:nordeim/programmer-blog.git` via the SSH wrapper.

### 12.2 Per-Phase Acceptance

The MEP defines phase-level acceptance. The summary:

- **Phase 1 (scaffold):** `pnpm install && pnpm dev` boots a 200 OK page that prints "/dev/log".
- **Phase 2 (DB):** `pnpm db:migrate && pnpm db:seed` leaves a populated `devlog.db`. Tests for schema and seed pass.
- **Phase 3 (UI primitives):** shadcn components render in isolation. The 4-button theme toggle works.
- **Phase 4 (landing):** the landing page matches the mockup. All hooks have tests.
- **Phase 5 (blog):** `/archive`, `/posts/[slug]`, `/snippets`, `/rss.xml`, `/sitemap.xml` all return 200.
- **Phase 6 (auth/admin/email):** the admin flow is end-to-end operable. Subscribe → confirm → email arrives in Resend's sandbox.
- **Phase 7 (tests/gates):** all gates green. Lighthouse ≥ 95.

---

## 13. Open Questions

These are not blockers — they are answered with the stated assumption. Surface them in the PRD so a future agent or engineer can revisit.

| # | Question | Assumption |
|---|----------|------------|
| Q1 | Is "Alex Rivera" the real author or a placeholder? | Placeholder. The author will replace it before launch. The site is built around this fictional persona to match the mockup. |
| Q2 | What is the actual production domain? | `devlog.example` (configurable via `NEXT_PUBLIC_SITE_URL`). |
| Q3 | Should the GitHub counter point to the `tailwindlabs/tailwindcss` repo (mockup's choice) or to the author's own repo? | Mockup's choice (`tailwindlabs/tailwindcss`) — configurable via `NEXT_PUBLIC_GITHUB_REPO`. |
| Q4 | Will the author use a real Resend API key in production? | Yes, set `RESEND_API_KEY` in the deploy environment. Dev uses `RESEND_API_KEY=re_...` from `.env.local` or `onboarding@resend.dev` sandbox. |
| Q5 | Are anonymous comments allowed (with moderation) or only authenticated subscribers? | Only authenticated subscribers. Anonymous comments are out of scope. |
| Q6 | Where is the site deployed? | Any Node 20+ host (Vercel, Fly.io, a VPS). v1 does not require a specific platform; the build produces a Node standalone server. |
| Q7 | Are there analytics? | None for v1. The mockup says "No analytics." If the author later wants privacy-friendly analytics, integrate Plausible (self-hosted). |
| Q8 | Should the cyber theme's CRT scanlines be on `body::before` (mockup) or on a dedicated overlay div? | On `body::before` per mockup — z-index 200, `mix-blend-mode: overlay`. |

---

## 14. Glossary

| Term | Definition |
|------|-----------|
| **App Router** | Next.js 13+ routing system using `app/` directory. Replaces the legacy `pages/` router. |
| **Better Auth** | A TypeScript-first auth library for Next.js / Node. Provides email/password, OAuth, session cookies, RBAC, plugins. Alternative to Auth.js / NextAuth. |
| **Cyber theme** | The third theme variant: near-black background, neon-green foreground, yellow/magenta accents, CRT scanline overlay. |
| **Drizzle ORM** | Type-safe SQL query builder. Native support for PostgreSQL, MySQL, SQLite. No codegen step. |
| **Editorial Terminal** | The design thesis for `/dev/log`. Intersection of long-form magazine typography and a programmer's terminal aesthetic. |
| **FR** | Functional Requirement. Numbered identifier (FR-N) used throughout PRD/PAD/MEP for traceability. |
| **ISR** | Incremental Static Regeneration. Next.js mechanism for re-rendering static pages on a schedule or on demand. |
| **MDX** | Markdown with embedded JSX/React components. Used for essay authoring. |
| **Pad** | Project Architecture Document (companion to this PRD). |
| **Mep** | Master Execution Plan (companion to this PRD). |
| **proxy.ts** | Next.js 16's replacement for `middleware.ts`. Edge-level request handler for auth redirects, rate-limit headers, etc. |
| **Resend** | Email API service. Used for subscribe confirmation and new-essay notifications. |
| **RSC** | React Server Components. Components that render on the server and stream HTML to the client. Default in Next.js 13+. |
| **Server Action** | Next.js Server-side function callable from a client component. Replaces `fetch('/api/...')` POSTs. |
| **shadcn/ui** | A collection of copy-paste React components styled with Tailwind. Not an npm package — files live in your repo. |
| **Turborepo** | Monorepo build system with cached task execution. |
| **Vitest** | Test runner with Jest-compatible API, native ESM, Vite-powered transform pipeline. |

---

**End of PRD.** For implementation, see `Master_Execution_Plan.md`. For architecture, see `Project_Architecture_Document.md`.

---

## Revision Block

### v1.1 — 2026-08-26 — Audit Remediation Alignment

Following the post-build code review and audit (`CODE_REVIEW_AUDIT_REPORT.md`) and execution of the remediation plan (`REMEDIATION_PLAN.md`), the following clauses are amended to reflect the as-built state:

- **§5.4 Security, Authentication clause** — amended. Better Auth is still listed as a dependency (planned for v1.5 RBAC plugin integration), but the v1 authentication flow uses a homegrown HMAC-SHA256 session-token system (`packages/auth/src/tokens.ts`, edge-safe) plus scrypt password hashing (`packages/auth/src/password.ts`, OWASP-recommended N=2^15, r=8, p=1). The substitution is recorded in PAD §4.2 ADR-006 (amended). The previous "Phase 6 will swap this for a real bcrypt compare" TODO is closed — `verifyPassword()` uses `timingSafeEqual` to prevent timing attacks.

- **§5.4 Security, Login rate limit clause** — implemented. `signInAction` calls `rateLimit('login:<ip>', 5, 600)` before any DB lookup. PRD target met.

- **§5.4 Security, Dependency hygiene clause** — implemented. `pnpm audit --prod` reports 0 critical, 1 high (down from 50 total / 3 critical / 18 high). The remaining high is a stylistic advisory in a transitive dev dependency. The `pnpm check` script now includes `pnpm audit --prod` as a gate.

- **§5.4 Security, Content-Security-Policy clause** — amended. Removed `'unsafe-eval'` from `script-src` per the PRD's original allowlist (script-src 'self' 'unsafe-inline'). Next.js 16 production builds do not require `'unsafe-eval'`.

- **§5.3 SEO, JSON-LD clause** — implemented. `apps/web/src/components/json-ld.tsx` renders `<script type="application/ld+json">` on the landing page (`WebSite` schema) and post pages (`Article` schema).

- **§6.1 Tech Stack, Better Auth row** — annotated. The row remains in the table (Better Auth is still installed and planned for v1.5), but a footnote records the v1 substitution: "v1 uses an in-house HMAC-SHA256 token system (edge-safe) plus scrypt password hashing; Better Auth's full RBAC plugin is deferred to v1.5. See PAD §4.2 ADR-006 (amended)."

- **§5.5 Reliability, Subscribe flow degradation clause** — implemented. The subscribe action inserts a `pending` subscriber and dispatches the Resend email; if Resend fails, the subscriber row is still created and a masked-email warning is logged. The user sees the success toast.

- **§5.4 Logging, Email masking clause** — implemented. `apps/web/src/lib/log.ts` exports `maskEmail()` and `logError()`; the subscribe action uses both. Other actions still use raw `console.error` — a v1.5 cleanup will migrate them.

- **Deferred to v1.5:** self-hosted fonts via `next/font/local` (§6.1, §9.2), dynamic OG image generation (§5.3), favicon + manifest (§5.3), `@devlog/types` Zod schema package (planned in MEP Phase 2).

The remediation plan, audit report, and this revision block are committed alongside the code on `main`.

### v1.2 — 2026-09-03 — Second Remediation Pass (Phase 9.5)

The v1.5 deferrals in v1.1 are now CLOSED (see `Master_Execution_Plan.md` §13, Phase 9.5):

- **Better Auth is now REMOVED** (was "still installed and planned for v1.5"). The §6.1 Better Auth row is retired; the homegrown HMAC + scrypt design in `@devlog/auth` is the permanent v1 auth (ADR-004 amendment — superseded). Revisit triggers: OAuth in v2.
- **Dependency hygiene clause** — strengthened. `pnpm audit --prod` now reports **0 vulnerabilities** (was "0 critical, 1 high"): better-auth removed + `pnpm.overrides` for the react-email/shadcn transitive tail.
- **Self-hosted fonts (§6.1, §9.2)** — implemented. `next/font/local` with 5 latin-subset variable woff2 files (132KB); zero Google Fonts requests.
- **Dynamic OG images (§5.3)** — implemented. `/opengraph-image` (site) + `/posts/[slug]/opengraph-image` (per-post) via `next/og`.
- **Favicon + manifest (§5.3)** — implemented. `src/app/icon.svg` + `src/app/manifest.ts` (Next.js file conventions).
- **`@devlog/types` (MEP Phase 2)** — implemented. Zod schemas for post/subscriber/comment/user/env + `slugify` + markdown-aware `calculateReadTime`; the admin actions import from it (single source of truth).
- **Email masking cleanup** — closed. `maskEmail`/`logError` are used by the subscribe, admin, and auth flows; tests pin the behavior.
- **Coverage** — 272 tests (up from 169), 65.36% lines (up from 44.43%); staged thresholds gate regressions, 80% target tracked as backlog R-30.

---

**End of PRD v1.2.** For implementation, see `Master_Execution_Plan.md`. For architecture, see `Project_Architecture_Document.md`. For the audit findings, see `CODE_REVIEW_AUDIT_REPORT.md`. For the remediation tasks, see `REMEDIATION_PLAN.md`.

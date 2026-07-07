# Equilibrium Labs Integration Plan

**Type:** Planning document. **No application code, no branding, no logos, no UI changes.**
**Status:** Proposed — awaiting review. **Date:** 2026-07-06.
**Source of truth:** *Equilibrium Labs — Identity Implementation Kit v1.0 (Approved direction, 2026).*
**Governing section:** Kit §06 *Endorsement*.

> This document assesses **how** Equilibrium Labs should be referenced in BillBuffer and
> proposes the smallest safe path to get there. It changes nothing on its own. BillBuffer
> remains the customer-facing brand; Equilibrium Labs is only a quiet parent-company
> endorsement.

---

## 1. The rule, in one line

> **The parent endorses. It never headlines.** (Kit §06)

Products own their names and faces. Equilibrium Labs appears **beside** BillBuffer only as a
quiet credit line — never larger or louder than BillBuffer's own mark, never co-locked at
equal size, never above the product, and never wearing the "EL" tile inside a product lockup.

## 2. Two references that must not be conflated

The Kit governs a **brand endorsement**. Legal and repo needs a **legal entity**. They read
differently and belong in different places. Getting this wrong is the main risk in the whole
effort.

| | Brand endorsement | Legal entity |
|---|---|---|
| **Exact string** | `An Equilibrium Labs company` | `Equilibrium Labs LLC` |
| **Source** | Kit §06 (fixed phrase) | Registered company name |
| **Purpose** | Quiet parent credit | Copyright, legal operator identity |
| **Where** | Public-page footers, About page | © notices, Privacy Policy body, repo metadata |
| **Suffix** | No `LLC` — it's a brand line | `LLC` — it's the entity |
| **Never** | Headlines, equal-size co-lock, in nav/hero | — |

**Finding:** today every public footer reads **"Made by Equilibrium Labs LLC."** That string
is *neither* — it announces ("Made by") rather than endorses, and it staples the legal suffix
onto a brand line. Correcting it is the one substantive change this plan recommends.

## 3. Current state (audit)

Every current reference, verified in the repo:

| Location | Current text | Kind |
|---|---|---|
| `src/routes/trust/+page.svelte` (footer) | `Made by Equilibrium Labs LLC` | footer copy |
| `src/routes/legal/privacy/+page.svelte` (footer) | `Made by Equilibrium Labs LLC` | footer copy |
| `src/routes/faq/+page.svelte` (footer) | `Made by Equilibrium Labs LLC` | footer copy |
| `e2e/trust.spec.ts:25`, `e2e/legal-privacy.spec.ts:25`, `e2e/faq.spec.ts:38` | asserts the string | test |
| `e2e/offline.spec.ts:91,117,142` | asserts the string in offline HTML | test |

**Not present anywhere else:** README, `package.json` (no `author`/`license`), `static/manifest.webmanifest`, app UI, nav, splash, favicon. That absence is correct and should mostly stay that way (§5).

**Helpful accident:** the three footers already sit under a hairline divider
(`border-top: 1px solid var(--line)`), in muted ink (`--ink3`), at `0.85rem` — i.e. *smaller
and quieter than the product name.* That is exactly the §06 endorsement treatment, so the
correction is **copy-only** — no new element, no layout, no restyle.

## 4. Where Equilibrium Labs SHOULD appear

| # | Place | Reference | Proposed copy | Notes |
|---|---|---|---|---|
| A | Public footers: `/trust`, `/legal/privacy`, `/faq` | Endorsement | `An Equilibrium Labs company` | Replaces "Made by Equilibrium Labs LLC". Quiet, muted, under the existing hairline. |
| B | Copyright line (same footers, optional small line) | Legal | `© 2026 Equilibrium Labs LLC` | Legal entity, small, below the endorsement. Founder decides if wanted alongside A. |
| C | Privacy Policy **body** (`/legal/privacy`) | Legal | "BillBuffer is operated by Equilibrium Labs LLC." | Identifies the operator/who-you-email. Strengthens the legal doc; does not change the privacy posture (still collects nothing). |
| D | `README.md` | Both | "BillBuffer is an Equilibrium Labs company. © 2026 Equilibrium Labs LLC." | Repo-level ownership + copyright. |
| E | `package.json` metadata | Legal | `"author": "Equilibrium Labs LLC"` (+ `license` if chosen) | Non-shipping metadata. |
| F | **Optional** About page (`/about` or `/legal/about`) | Endorsement (vertical lockup) | "BillBuffer" / "An Equilibrium Labs company" | Only if justified — see §5 and PR 4. Default: **defer.** |

## 5. Where Equilibrium Labs SHOULD NOT appear (hard no)

Drawn from the task rules and Kit §06/§07. These are rejections, not open questions.

- **No hero / top-of-page branding.** The top wordmark stays **BillBuffer** alone on every page.
- **No navigation / app-chrome branding.** The header (`+layout.svelte` nav) names product screens only.
- **No splash / PWA start branding.** No parent name on any launch/onboarding surface.
- **No manifest changes.** `name`/`short_name` stay "BillBuffer"; `theme_color`/`background_color` unchanged.
- **No product favicon/app-icon change.** BillBuffer keeps `favicon.svg`. The **"EL" tile is a favicon *utility for Equilibrium Labs' own* surfaces**, not BillBuffer's — Kit §07 + §06 forbid putting the EL tile in a product lockup.
- **No parent in product UI** — split/home, paycheck, bills, bill editor, in-app `/privacy` screen: unchanged.
- **No co-lockup at equal size, no parent-above-product, no "EL" letters as a logo.**
- **No Libre Franklin / Newsreader webfont added** to ship the endorsement. BillBuffer uses a system-font stack and makes **zero external requests** (a Product Promise). The Kit itself permits the fallback *Franklin → system-ui*, so the endorsement ships correctly in BillBuffer's existing type. (See §7.)
- **No recolor.** The endorsement uses BillBuffer's existing muted-ink token, not the `--el-*` palette. Kit: color is introduced only by a product, never by the corporate brand.
- **No `<title>` / meta changes.** Page titles stay "… — BillBuffer".
- **No repositioning / marketing copy.** No taglines, no "by Equilibrium Labs" headline.

## 6. Proposed copy (verbatim, ready to paste)

- **Endorsement (footers, About):** `An Equilibrium Labs company`
- **Copyright (optional legal line):** `© 2026 Equilibrium Labs LLC`
- **Privacy Policy operator clause:** `BillBuffer is operated by Equilibrium Labs LLC. Equilibrium Labs still receives none of your financial data — it stays on your device.`
- **README ownership line:** `BillBuffer is an Equilibrium Labs company. © 2026 Equilibrium Labs LLC.`

All four obey Kit §05 *Voice* (plainspoken, no hype, no exclamation) and BillBuffer's
Constitution rule 5 (Calm Language). None announces; each states.

## 7. Reconciliation: Kit type/color vs BillBuffer's guardrails

The Kit specifies **Libre Franklin 500** and the **achromatic `--el-*` palette** for the
endorsement lockup. BillBuffer cannot adopt those literally without breaking its own rules:

- **Fonts:** adding a webfont means either an external request (breaks the zero-network
  Product Promise) or bundling a font file (adds weight + a visual change). The Kit's own
  fallback — *Franklin → system-ui* — resolves this: ship the endorsement **phrase and
  hierarchy** in BillBuffer's current system stack. On-brand, no new bytes.
- **Color:** the endorsement stays in BillBuffer's muted ink. The Kit reserves `--el-*` for
  Equilibrium Labs' *own* corporate surfaces, not for a product's pages.

Net: we implement §06's **intent** (exact phrase, quieter and smaller than the product mark,
under a hairline divider) using assets BillBuffer already ships. This is why every proposed
change is copy/metadata, not design.

## 8. Proposed file changes

| File | Change | Type |
|---|---|---|
| `src/routes/trust/+page.svelte` | footer: `Made by Equilibrium Labs LLC` → `An Equilibrium Labs company` (+ optional `© 2026 Equilibrium Labs LLC`) | copy |
| `src/routes/legal/privacy/+page.svelte` | same footer change; add operator clause in body | copy |
| `src/routes/faq/+page.svelte` | same footer change | copy |
| `e2e/trust.spec.ts`, `e2e/legal-privacy.spec.ts`, `e2e/faq.spec.ts` | update assertion string | test |
| `e2e/offline.spec.ts` (×3) | update asserted offline-HTML string | test |
| `README.md` | add ownership + copyright line | doc |
| `package.json` | add `author` (+ `license`?) | metadata |
| *(optional)* `src/routes/about/` + spec | new About page with vertical lockup | new route |

Note: the `.svelte` edits are **footer/legal text only** — no logic, no components, no styles.

## 9. Risk

| Change | Risk | Why |
|---|---|---|
| Footer endorsement + copyright (A/B) | **LOW** | Copy-only; reuses existing footer styling; tests updated in lockstep. |
| Privacy Policy operator clause (C) | **LOW–MEDIUM** | Legal wording — founder review; must stay factually true. |
| README / metadata (D/E) | **LOW** | Non-shipping; no UI, no tests. |
| About page (F) | **MEDIUM** | New public route; repositioning/scope-creep risk; needs justification. |
| **Overall program** | **LOW** | Small, reversible, text-first; the one real hazard is conflating brand vs legal string (§2) or over-announcing. |

## 10. Smallest safe PR breakdown

Ordered; each is independently shippable and reversible.

**PR 1 — Footer + copyright text (the correction).**
Replace "Made by Equilibrium Labs LLC" with the endorsement `An Equilibrium Labs company`
(and, if founder wants it, a small `© 2026 Equilibrium Labs LLC` line) on `/trust`,
`/legal/privacy`, `/faq`; update the 4 e2e assertions (trust, legal-privacy, faq, offline ×3).
No layout/style change. **Risk: LOW.** Zero dependencies.

**PR 2 — Public trust/legal page references.**
Add the operator clause to the Privacy Policy body (C); optionally a single quiet
"BillBuffer is an Equilibrium Labs company" line of context on `/trust`. Legal-wording review.
**Risk: LOW–MEDIUM.** Can fold into PR 1 if founder prefers one review pass, but kept separate
so legal body copy is reviewed on its own.

**PR 3 — README / repo metadata.**
Ownership + copyright in `README.md`; `author` (and a deliberate `license`) in `package.json`;
optional `LICENSE`. **Risk: LOW.** No shipped surface.

**PR 4 — Optional About page (only if justified).**
A minimal, prerendered `/about` (or `/legal/about`) carrying the **vertical** endorsement
lockup per §06 — no hero, no repositioning, static/no-JS like `/trust`. **Risk: MEDIUM.**
**Default recommendation: defer** (footers already carry the endorsement; an About page adds a
surface with repositioning risk and no clear beta need).

## 11. Recommended first implementation PR

**PR 1 — footer + copyright text.** It is zero-dependency and lowest-risk, and it is the only
change that **fixes an existing inaccuracy**: the shipped "Made by Equilibrium Labs LLC" is not
the Kit's approved endorsement and slightly announces. PR 1 brings all three public pages onto
the exact §06 phrase, establishes the correct pattern the About page (if ever built) reuses,
and needs no new styling because the footers already provide the divider + muted, smaller type.

## 12. Reject or defer

**Reject (out of scope, against Kit §06/§07 or task rules):**
- EL tile or any logo inside a BillBuffer lockup, header, or as the app/product favicon.
- Co-equal wordmark co-lock; parent above product; parent in nav, hero, or splash.
- Manifest `name`/`short_name`/icon/theme changes for parent branding.
- Libre Franklin/Newsreader **webfont** to render the endorsement (breaks zero-network; alters UI).
- `--el-*` recolor of BillBuffer surfaces.
- Any "by Equilibrium Labs" tagline, marketing copy, or product repositioning.

**Defer (revisit only with a concrete need):**
- About page (PR 4) — until there's a real reason beyond the footer endorsement.
- Self-hosted Libre Franklin for the endorsement — only inside a future, deliberate typography
  pass that self-hosts fonts *and* preserves the zero-network promise. Not now.

## 13. Open questions

1. Confirm the exact registered legal name — `Equilibrium Labs LLC` — for © and the operator clause.
2. Copyright year: fixed `2026`, or a maintained range? (Static pages favor a single year.)
3. Do the public footers get the `© 2026 Equilibrium Labs LLC` line *in addition to* the
   endorsement, or endorsement only (quietest option)?
4. `package.json` license: keep `"private": true` with `UNLICENSED`, or adopt a chosen license?
5. Does the Privacy Policy operator clause need a jurisdiction/address for legal sufficiency?
   (Legal review — out of scope for these PRs.)

---

*Planning artifact only. No code, no branding, no logo, no UI change. Implementation happens in
the separate PRs above, each reviewed on its own.*

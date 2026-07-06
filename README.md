# BillBuffer

**A privacy-first, local-only PWA that answers one question:**
*how much of each paycheck is for bills, and how much is safe to spend?*

Not a budget app. Not a tracker. No login, no bank link, no cloud — it works in
airplane mode and your numbers never leave your device.

> **"We don't know you exist."** Once you have BillBuffer, we have no idea who you
> are, what you earn, or what you owe. Your data stays on your device, under your
> control.

---

## Status

- **Prototype v1: frozen.** A disposable single-file working model was used to
  validate the UX, wording, and the calculation engine. It is **not production
  code** and is **not committed** (it embedded local personal test data). It stays
  local-only and is git-ignored.
- **Production: not started.** No application code exists yet. This repo is
  currently a **documentation + architecture foundation**.
- **The docs are the source of truth** until the production build begins. Build
  against the specs here, not against the prototype.

## Direction (locked)

- **Privacy-first, local-only PWA.** All data stays on-device.
- **No backend for the MVP.** No server, no database, no accounts, no auth, no
  analytics, no bank connections. (See the guardrails.)
- **Static PWA** (SvelteKit + TypeScript) with **IndexedDB** storage and local
  **JSON export/import** as the only data portability.

## The Constitution is the supreme authority

[**`docs/vision/BILLBUFFER_CONSTITUTION.md`**](./docs/vision/BILLBUFFER_CONSTITUTION.md)
is the **highest-level document in this repository.** If any other document, spec,
design, feature proposal, or AI-generated code conflicts with it, **the Constitution
wins.** Every other document below serves it.

## Start here — required reading order

Read these five, in this order, before contributing anything (human or AI):

1. [`docs/vision/BILLBUFFER_CONSTITUTION.md`](./docs/vision/BILLBUFFER_CONSTITUTION.md) — the supreme charter: purpose, promise, and the seven rules.
2. [`docs/architecture/ARCHITECTURE_GUARDRAILS.md`](./docs/architecture/ARCHITECTURE_GUARDRAILS.md) — the non-negotiable technical rules the Constitution implies.
3. [`docs/engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md`](./docs/engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md) — product goal, stack, screens, data model, phases, acceptance criteria.
4. [`docs/engineering/CALCULATION_ENGINE_SPEC.md`](./docs/engineering/CALCULATION_ENGINE_SPEC.md) — the fixed-transfer forecast engine, specified precisely.
5. [`docs/engineering/TEST_MATRIX.md`](./docs/engineering/TEST_MATRIX.md) — required test coverage for the engine + validators.

## Documentation map

All documentation lives under [`docs/`](./docs/), organized by tier. See
[`docs/README.md`](./docs/README.md) for the full index.

**Vision** — why BillBuffer exists (the supreme tier)
| Doc | Purpose |
|---|---|
| [`docs/vision/BILLBUFFER_CONSTITUTION.md`](./docs/vision/BILLBUFFER_CONSTITUTION.md) | **Supreme authority.** Purpose, promise, the seven rules, success. |
| [`docs/vision/BILLBUFFER_NORTH_STAR.md`](./docs/vision/BILLBUFFER_NORTH_STAR.md) | What to optimize for when a product decision is open. |
| [`docs/vision/BILLBUFFER_PHILOSOPHY.md`](./docs/vision/BILLBUFFER_PHILOSOPHY.md) | Core beliefs, the "NOT list", and the banned-word dictionary. |

**Product** — who it's for and what v1 is
| Doc | Purpose |
|---|---|
| [`docs/product/BILLBUFFER_PRIVACY_MANIFESTO.md`](./docs/product/BILLBUFFER_PRIVACY_MANIFESTO.md) | Privacy-first architecture and trust indicators. |
| [`docs/product/BILLBUFFER_MVP_DEFINITION.md`](./docs/product/BILLBUFFER_MVP_DEFINITION.md) | v1 feature scope (calculation section reconciled — see banner inside). |
| [`docs/product/BILLBUFFER_USER_PERSONAS.md`](./docs/product/BILLBUFFER_USER_PERSONAS.md) | Who we build for (and the anti-persona). |
| [`docs/product/BILLBUFFER_OPEN_QUESTIONS.md`](./docs/product/BILLBUFFER_OPEN_QUESTIONS.md) | Open product questions (architecture ones resolved — see banner inside). |

**Architecture** — the technical rules
| Doc | Purpose |
|---|---|
| [`docs/architecture/ARCHITECTURE_GUARDRAILS.md`](./docs/architecture/ARCHITECTURE_GUARDRAILS.md) | The non-negotiable rules (no backend/auth/analytics/bank/cloud). |
| [`docs/architecture/BILLBUFFER_TECHNICAL_STACK.md`](./docs/architecture/BILLBUFFER_TECHNICAL_STACK.md) | Locked MVP stack; future-only ideas fenced separately. |

**Engineering** — how to build it
| Doc | Purpose |
|---|---|
| [`docs/engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md`](./docs/engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md) | Product goal, stack, screens, data model, phases, acceptance criteria. |
| [`docs/engineering/CALCULATION_ENGINE_SPEC.md`](./docs/engineering/CALCULATION_ENGINE_SPEC.md) | The fixed-transfer forecast engine (+ Fixture A regression anchor). |
| [`docs/engineering/TEST_MATRIX.md`](./docs/engineering/TEST_MATRIX.md) | Required test coverage for the engine + validators. |

**History / superseded** — [`docs/history/`](./docs/history/)
Archive for retired or superseded documents. Nothing is deleted; superseded content
moves here with a note pointing to what replaced it. Empty today — every current
document is active (see [`docs/history/README.md`](./docs/history/README.md)).

> No current document contradicts the Constitution. Where an older doc conflicted
> with the *locked architecture* (a backend, accounts, analytics, cloud sync, an
> averaging calculation), it was updated or marked reconciled in place with a pointer
> to the authoritative doc — never silently removed.

## What this is not

No budgeting, no categories, no allocations, no "cashflow," no financial planning,
and no feature creep. One question, answered calmly, on your device.

## Next step

Production work starts from `docs/engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md`
once the foundation is accepted. Do not copy prototype code into production, and do
not commit personal seed data.

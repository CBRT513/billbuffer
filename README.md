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

## Documents

**Production foundation (authoritative, build from these):**

| Doc | Purpose |
|---|---|
| [`ARCHITECTURE_GUARDRAILS.md`](./ARCHITECTURE_GUARDRAILS.md) | The non-negotiable rules (no backend/auth/analytics/bank/cloud). |
| [`PRODUCTION_IMPLEMENTATION_BRIEF.md`](./PRODUCTION_IMPLEMENTATION_BRIEF.md) | Product goal, stack, screens, data model, phases, acceptance criteria. |
| [`BILLBUFFER_TECHNICAL_STACK.md`](./BILLBUFFER_TECHNICAL_STACK.md) | Locked MVP stack; future-only ideas fenced separately. |
| [`CALCULATION_ENGINE_SPEC.md`](./CALCULATION_ENGINE_SPEC.md) | The fixed-transfer forecast engine, specified precisely (+ Fixture A regression anchor). |
| [`TEST_MATRIX.md`](./TEST_MATRIX.md) | Required test coverage for the engine + validators. |

**Product / philosophy (still valid; reconciled to the locked architecture):**

| Doc | Purpose |
|---|---|
| [`BILLBUFFER_PHILOSOPHY.md`](./BILLBUFFER_PHILOSOPHY.md) | Core beliefs, the "NOT list", and the banned-word dictionary. |
| [`BILLBUFFER_PRIVACY_MANIFESTO.md`](./BILLBUFFER_PRIVACY_MANIFESTO.md) | Privacy-first architecture and trust indicators. |
| [`BILLBUFFER_MVP_DEFINITION.md`](./BILLBUFFER_MVP_DEFINITION.md) | v1 feature scope (calculation section superseded — see banner inside). |
| [`BILLBUFFER_USER_PERSONAS.md`](./BILLBUFFER_USER_PERSONAS.md) | Who we build for (and the anti-persona). |
| [`BILLBUFFER_OPEN_QUESTIONS.md`](./BILLBUFFER_OPEN_QUESTIONS.md) | Open product questions (architecture ones now resolved — see banner inside). |

> Where an older doc conflicted with the locked architecture (a backend, accounts,
> analytics, cloud sync, an averaging calculation), it has been updated or marked
> superseded with a pointer to the authoritative doc above.

## What this is not

No budgeting, no categories, no allocations, no "cashflow," no financial planning,
and no feature creep. One question, answered calmly, on your device.

## Next step

Production work starts from `PRODUCTION_IMPLEMENTATION_BRIEF.md` once the
foundation is accepted. Do not copy prototype code into production, and do not
commit personal seed data.

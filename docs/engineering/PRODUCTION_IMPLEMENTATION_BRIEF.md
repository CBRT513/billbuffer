# BillBuffer — Production Implementation Brief

**Status:** Approved direction. Build foundation only after this brief + the specs
are accepted. **Updated:** 2026-06-29

Governed by [`../vision/BILLBUFFER_CONSTITUTION.md`](../vision/BILLBUFFER_CONSTITUTION.md)
(the supreme authority). Read alongside `ARCHITECTURE_GUARDRAILS.md` (the rules),
`BILLBUFFER_TECHNICAL_STACK.md` (the stack), `CALCULATION_ENGINE_SPEC.md` (the math),
and `TEST_MATRIX.md` (the proof).

---

## 1. Product goal

BillBuffer answers **one question**: *how much of each paycheck is for bills, and
how much is safe to spend?* It is not a budget app, a tracker, or a financial
planner. It computes a **recurring per-paycheck transfer** into a bills account —
plus a one-time **startup catch-up** when bills land before enough paychecks have —
that keeps the account at or above a chosen cushion across a 36-month forecast, and
shows the rest as the user's to spend. The plan is chosen by a **two-branch policy**
(full detail in `CALCULATION_ENGINE_SPEC.md` §1/§6):

- **Normal branch:** minimize the startup catch-up **first**, then take the smallest
  recurring transfer that holds the cushion — **not** the globally smallest transfer.
- **Timing fallback:** if that recurring transfer would exceed one paycheck yet the
  bills are affordable over time (average outflow per paycheck ≤ paycheck), it is a
  **timing problem, not impossible** — the engine does **not** minimize the catch-up
  here; instead it caps the recurring transfer at an affordable level (≈ the average
  outflow) and accepts a **larger** startup catch-up.

The engine never recommends a recurring transfer larger than one paycheck, and never
allows an arbitrarily large catch-up just to shrink the transfer. The UI still gives
one answer: a recurring transfer plus a startup catch-up when needed.

The emotional promise is privacy and calm: no login, no bank link, works in
airplane mode, "we don't know you exist."

---

## 2. Production stack

- **Framework:** SvelteKit + TypeScript, built as a **static** site
  (`@sveltejs/adapter-static`, prerendered, SPA fallback).
- **Runtime:** Progressive Web App — installable, offline-first.
- **Storage:** IndexedDB on-device only (no server, no sync).
- **Backend / DB / auth / analytics / bank links:** **none.** (See guardrails.)
- **Hosting:** static host / CDN that stores no user data.

Full rationale and the explicitly-excluded list live in
`BILLBUFFER_TECHNICAL_STACK.md`.

---

## 3. MVP screens

Mirror the validated prototype flow (six screens):

1. **Welcome / privacy promise** — three calm cards ("not a budget app", "we don't
   know you exist", "add all your bills"). Skippable.
2. **Paycheck setup** — amount, frequency (weekly / every 2 weeks / monthly), next
   payday, bills-account balance today (may be negative if overdrawn), cushion
   (floor, ≥ 0, default $0). Editable later.
3. **Split (home)** — hero *Yours each paycheck* and *Put into bills each paycheck*,
   a two-color proportion bar (For bills / Yours), a forecast card (lowest projected
   balance + date, and starting catch-up when required), and a collapsible
   "Why this amount?" explanation. Switches to the impossible-plan state when bills
   exceed income.
4. **Bills** — list (name, frequency tag, next due date, amount); tap to edit/delete.
5. **Add / edit bill** — name, amount, next due date, frequency (monthly / every 3
   months / once a year), plus optional revolving-debt section (balance, APR, payoff
   explorer, opt-in "stop when paid off").
6. **Privacy / trust** — plain-language "everything we hold" table, **Export** /
   **Import** (local JSON), **Delete everything**.

**Not in production:** the prototype's "Pretend today is…" control and its
load/clear test-data buttons are testing-only and must not ship. They become test
fixtures, not UI.

---

## 4. Data model

Persisted on-device. TypeScript shapes (authoritative validation in
`CALCULATION_ENGINE_SPEC.md`):

```ts
type Frequency = "weekly" | "biweekly" | "monthly";      // paycheck
type BillFreq  = "monthly" | "quarterly" | "annual";     // bill

interface Paycheck {
  amount: number;        // > 0, finite
  freq: Frequency;
  next: string;          // "YYYY-MM-DD", strictly valid AND must produce >= 1 payday
                         // inside the 36-month horizon (reject if next > horizonEnd)
  // Actual current balance of the account bills are paid from.
  // MAY BE NEGATIVE (overdrawn). Must be finite. NOT required to be >= 0.
  // (Prototype field name was `setAside` — legacy.)
  billsAccountBalanceToday: number;
  cushion: number;       // floor, MUST be >= 0, finite (default 0)
}

interface Bill {
  id: string;
  name: string;          // non-empty
  amount: number;        // > 0, finite (the "minimum payment" if revolving)
  dueDate: string;       // "YYYY-MM-DD", strictly valid (next occurrence)
  freq: BillFreq;        // forced to "monthly" when showPayoff is true
  showPayoff: boolean;   // is a credit card / revolving debt
  balance: number;       // >= 0, finite (0 allowed = already paid off)
  apr: number;           // >= 0, finite
  stopWhenPaid: boolean; // opt-in: drop from forecast after payoff month
}

interface AppData {
  onboarded: boolean;
  paycheck: Paycheck | null;
  bills: Bill[];
  // NOTE: no `testToday` in production — that is a prototype-only testing hook.
}
```

---

## 5. Storage rules

- All persisted user data lives in **IndexedDB**, on-device, under one app
  database. No server, no remote sync, no cloud backup.
- Writes are local and synchronous-feeling; the UI never blocks on a network call
  (there are none).
- Reads must tolerate an empty/first-run store and a partially-populated store
  (onboarded but no paycheck, paycheck but no bills).
- Schema version must be stored so future migrations are possible without data loss.
- No user data in `localStorage`, cookies, query strings, or logs.

---

## 6. Export / import rules

- **Export:** serialize the full `AppData` to a downloadable `billbuffer-backup.json`.
- **Import:** read a local JSON file and **validate it against the same rules as
  live input** before replacing state. Invalid files are rejected with a clear,
  plain-language message and the current data is left untouched.
- Rejection cases (see spec for the full list): not an object / no bills array,
  non-finite or non-positive amounts, invalid frequencies, invalid or impossible
  dates, a next payday that yields **zero paydays in the 36-month horizon**, negative
  cushion, and a "stop when paid off" toggle with a blank balance.
- Import/export is the user's only data portability path and a core trust feature —
  it is **in MVP**.

---

## 7. PWA / offline behavior

- Installable to home screen; launches standalone.
- Service worker caches the app shell so the app **loads and runs with zero
  network**, including airplane mode and after the host is unreachable.
- No runtime fetch of user data — there is no user data anywhere but the device.
- First load works online; every subsequent load works offline.
- The service worker caches only static app assets, never user data, and logs nothing.

---

## 8. Development phases

Each phase compiles, passes its tests, and is independently shippable.

1. **Scaffold** — SvelteKit + TS, static adapter, base routes/screens as stubs,
   lint/format/test tooling. No logic yet.
2. **Data layer** — IndexedDB wrapper, `AppData` types, schema version, CRUD,
   first-run/empty-state handling. Unit-tested.
3. **Calculation engine** — port the spec (NOT the prototype JS) into typed,
   pure functions. Build against `TEST_MATRIX.md`; the Fixture A regression and
   all edge cases pass before any UI is wired.
4. **Validation layer** — strict date parsing, live-input validation, and the
   shared import validator. Tested to reject every case in the matrix.
5. **Screens** — implement the six screens against the data + engine layers.
6. **PWA / offline** — manifest, icons, service worker, install + airplane-mode
   verification.
7. **Export / import** — local JSON round-trip using the shared validator.
8. **Polish** — copy audit against the banned-word list, accessibility, empty
   states, and the privacy/trust screen.

---

## 9. Acceptance criteria

- **Engine correctness:** Fixture A (the synthetic regression scenario in
  `CALCULATION_ENGINE_SPEC.md` §13) reproduces its documented result — **$664**
  into bills / **$836** yours / **$45** starting catch-up / lowest **$0** on
  **2030-01-02**, not impossible — and **every** case in `TEST_MATRIX.md` passes.
- **Privacy:** zero network requests carry user data; the app works fully in
  airplane mode; no analytics, accounts, auth, or bank links exist.
- **Storage:** all user data is in IndexedDB; nothing personal is in
  localStorage, cookies, URLs, or logs.
- **Portability:** export → delete everything → import round-trips losslessly;
  invalid imports are rejected without corrupting current data.
- **PWA:** installable; loads and runs offline after first visit.
- **Directional rounding holds:** displayed "into bills" never underfunds and
  displayed "yours" never overstates spendable.
- **Scope:** no budgeting/tracker features, no banned vocabulary in UI copy, and
  no prototype testing controls shipped.

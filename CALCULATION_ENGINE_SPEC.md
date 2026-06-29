# BillBuffer — Calculation Engine Specification

**Status:** Authoritative. The production engine is built from this spec, not by
copying the prototype JavaScript. **Updated:** 2026-06-29

This document specifies the **fixed-transfer forecast engine** behaviorally and
mathematically, so it can be re-implemented in typed, pure functions and verified
against `TEST_MATRIX.md`. Where the prototype is referenced it is the source of
the *behavior*, not the source of the *code*.

---

## 1. Overview — fixed-transfer forecast engine

The engine answers one question: **the smallest fixed per-paycheck transfer `X`
into the bills account such that, simulated from the real starting balance over a
36-month horizon, the account never drops below the cushion.**

It is **not** an average of bills. It is a **binary search over a day-by-day
simulation** of the account, exploiting the fact that the lowest projected balance
rises monotonically as `X` increases.

Outputs:

- `X` — exact smallest steady transfer (currency, internally to the cent).
- `yours` = `paycheck − X`.
- `startCatchUp` — one-time amount that must already be in the account before the
  first paycheck (a gap no transfer can close).
- `minBal`, `minDate` — lowest projected balance under the plan and when it occurs.
- `impossible` — true when the required transfer exceeds one paycheck.

All money math is done in a way that avoids float drift (integer cents in the
search). Display rounding is directional — see §9.

---

## 2. 36-month horizon

- "Today" is the current local date at midnight. (The prototype additionally
  supports a `testToday` override; production exposes this **only** to the test
  harness, never in the UI.)
- The horizon end is **today shifted forward 36 months**, using month-clamped math
  (§4) so the end date is well-defined regardless of the day-of-month.
- All paydays and bill occurrences are generated within `[today, horizonEnd]`.

---

## 3. Paycheck generation

Paydays are **anchored to the next payday** and generated with **no date drift**:

- `weekly`: next payday + 7·k days.
- `biweekly`: next payday + 14·k days.
- `monthly`: next payday shifted by k months with end-of-month clamping (§4).

Generation starts at the first occurrence **on or after today** and continues
through `horizonEnd`. The next payday itself must be a strictly valid date (§10).

> **Twice-monthly pay is intentionally excluded.** Modeling it correctly needs two
> fixed anchor dates, which a single "next payday" input cannot capture. Only
> weekly / biweekly / monthly are supported.

---

## 4. Bill recurrence generation

Each bill recurs from its **original due date**, never from the last generated
occurrence (no drift):

- Period in months: `monthly → 1`, `quarterly → 3`, `annual → 12`.
- The k-th occurrence = the original due date shifted by `period·k` months, with
  **end-of-month day clamping**: shifting to a shorter month clamps the day to that
  month's last day. E.g. a Jan 31 monthly bill → Feb 28 (or Feb 29 in a leap year)
  → Mar 31 → … The day is always measured from the *original* due date, so it does
  not permanently collapse after a short month.
- Occurrences are emitted from the first one **on or after today** through
  `horizonEnd`.

Revolving-debt bills additionally obey the stop rule in §8.

---

## 5. Same-day ordering — bill before paycheck

When a bill outflow and a payday inflow fall on the **same calendar day**, the
**bill is applied before the paycheck** (the conservative assumption — money must
already be there when the bill hits). The simulation merges all inflow and outflow
events, sorts chronologically, and breaks same-day ties with **outflow first,
inflow second**.

---

## 6. Starting catch-up

Some bills can fall **before enough paychecks have landed** (e.g. a card due before
payday #1, or rent due two days after onboarding). That gap cannot be closed by any
steady transfer, so it is reported as a one-time **"get this into the account now"**
amount.

Computation:

1. Simulate the timeline with an effectively infinite transfer; record the deepest
   (lowest) balance reached, `deepest`.
2. `startCatchUp = max(0, cushion − deepest)`, rounded **up** to the cent.
3. `effectiveStart = setAside + startCatchUp`.
4. The steady transfer `X` is then searched from `effectiveStart` (§7).

`preNeed = max(0, setAside − deepest)` is the amount of pre-first-payday need the
existing balance already covers; it drives the adaptive "Why this amount?" copy
(when the account already has enough, no catch-up is shown and the leftover balance
slightly lowers `X`).

When a catch-up is required, the two hero labels read **"…each paycheck after
setup."** The catch-up explanation is **cause-aware**: bills-due-before-payday only,
below-cushion only, or both.

---

## 7. Cushion

- The cushion is a **floor** the bills account must never drop below. Default `$0`.
- Must be `>= 0` and finite (§10).
- The engine's feasibility test is: `simulate(X).minBal >= cushion` (within a tiny
  epsilon for float tolerance).
- `X` is found by binary search over **integer cents** between 0 and a provably
  feasible upper bound (`totalOutflow + cushion + slack`). The search returns
  **exactly 0** when no transfer is needed (no phantom $1), and avoids float-ceil
  drift on exact-dollar plans.

---

## 8. Revolving debt rules

A bill flagged as a credit card / revolving debt (`showPayoff = true`):

- Is treated as an **ordinary monthly bill by default** and **runs the full
  horizon** — its minimum keeps counting until the user edits it, deletes it, or
  opts in to stop.
- Has its **frequency forced to monthly** (cards are monthly; the picker is locked
  in the UI and import coerces it).
- **`stopWhenPaid` (opt-in, default off)** is the only thing that drops it from the
  forecast after payoff:
  - If `balance <= 0` → it generates **zero** future payments (already paid off).
  - Else compute payoff months via amortization (below); if it pays off, the bill
    contributes exactly that many monthly payments and then stops. If it never pays
    off, it stays ongoing for the full horizon.
- The payoff **estimate is informational only** and never changes the forecast on
  its own. The in-bill slider is exploratory; it changes the stored minimum payment
  only when the user explicitly applies it.

**Amortization (monthly):** starting from `balance`, each month: accrue interest
`balance += balance · (apr/100/12)`, then apply `payment` (last payment is whatever
remains). If `apr > 0` and `payment <= balance · monthlyRate`, the balance never
decreases — report "never pays off" rather than a fake payoff date. Outputs:
months to payoff, total paid, interest paid.

---

## 9. Directional rounding

Internal math is exact (to the cent). **Display** rounding is directional so a
rounded figure can never mislead:

- **"Put into bills" rounds UP** to the whole dollar (never underfund the forecast).
- **"Yours" rounds DOWN** to the whole dollar (never overstate spendable).
- **Starting catch-up rounds UP** to the whole dollar.

Example: an exact transfer of **$820.04** displays as **$821** into bills and
**$379** yours (from a $1,200 paycheck).

---

## 10. Strict date validation

All dates are `YYYY-MM-DD` and validated by a **round-trip parser**: the parsed
date must reproduce the exact year/month/day it was given. This rejects impossible
dates instead of silently rolling them:

- `2026-02-31` → rejected.
- `2026-02-29` (non-leap) → rejected.
- `2028-02-29` (leap) → accepted.
- Non-matching formats, out-of-range months/days → rejected.

Strict validation applies to **every** date the engine touches: paycheck next
payday, each bill due date, the test-only "today" override, imported dates, and all
internal recurrence math.

---

## 11. Impossible-plan state

If `paycheck > 0` and the required transfer `X > paycheck`, the plan cannot
balance. The engine reports `impossible = true`. The UI must then:

- Show **Yours = $0** (never a negative number).
- Show **"Bills need $X"** and **"Short by $(X − paycheck)" each paycheck**.
- Explain that, over 3 years, bills cost more than income — so a bill must drop or
  shrink, or income must rise.

---

## 12. Import validation

Imported JSON is validated against the **same rules as live input** before it
replaces any state. On any failure, reject with a clear, plain-language message and
leave current data untouched. Reject when:

- The file is not an object, or has no `bills` array.
- `testToday` (if present) is not a strictly valid date.
- Paycheck (if present): `amount` not finite or `<= 0`; `freq` not one of
  weekly/biweekly/monthly; `next` not a strictly valid date; `setAside` not finite;
  `cushion` not finite or `< 0`.
- Any bill: missing/empty name; `amount` not finite or `<= 0`; `dueDate` not a
  strictly valid date; `freq` not one of monthly/quarterly/annual; `balance` not
  finite or `< 0`; `apr` not finite or `< 0`.
- A bill with `showPayoff` **and** `stopWhenPaid` but a **blank** balance →
  rejected ("a paid-off forecast toggle needs a balance; use 0 if already paid
  off"). Balance `0` or `> 0` is accepted; blank balance is allowed only when the
  toggle is off.

On success, normalize: trim names, default missing `setAside`/`cushion`/`apr` to 0,
coerce `showPayoff` bills to monthly frequency, and assign ids where missing.

---

## 13. Reference result — Fixture A (fixed-transfer regression scenario)

A synthetic, non-personal fixture used as the engine's regression anchor. All
names and numbers are invented; no personal data is involved.

**Inputs** (today `2030-01-01`, paycheck **$1,500** biweekly, next payday
`2030-01-04`, starting balance `$0`, cushion `$0`):

| Bill | Amount | Frequency | Next due | Notes |
|---|---|---|---|---|
| Card A | $45 | monthly | 2030-01-02 | revolving (bal $400, 24% APR), ongoing |
| Electricity | $90 | monthly | 2030-01-15 | |
| Phone Plan | $70 | monthly | 2030-01-20 | |
| Apartment | $900 | monthly | 2030-01-25 | |
| Auto Loan | $250 | monthly | 2030-02-10 | |
| Water | $60 | quarterly | 2030-02-05 | |
| Registration | $120 | annual | 2030-03-01 | |

**Expected outputs:**

| Output | Value |
|---|---|
| Paychecks in 36 months | 79 |
| Exact transfer (engine) | $663.13 |
| Put into bills / paycheck (rounded up) | **$664** |
| Yours / paycheck (rounded down) | **$836** |
| Starting catch-up (rounded up) | **$45** |
| Lowest projected balance | $0 (= cushion) on 2030-01-02 |
| Impossible? | No |

The $45 catch-up equals Card A, the only bill due before the first payday. This
fixture exercises monthly, quarterly, annual, and revolving bills, a starting
catch-up, and directional rounding ($664 up + $836 down = the $1,500 paycheck).
It is the regression anchor referenced by `TEST_MATRIX.md`.

# BillBuffer — Calculation Engine Specification

**Status:** Authoritative. The production engine is built from this spec, not by
copying the prototype JavaScript. **Updated:** 2026-06-29

This document specifies the **fixed-transfer forecast engine** behaviorally and
mathematically, so it can be re-implemented in typed, pure functions and verified
against `TEST_MATRIX.md`. Where the prototype is referenced it is the source of
the *behavior*, not the source of the *code*.

---

## 1. Overview — fixed-transfer forecast engine

The engine selects **one practical plan**, made of two parts:

- a **recurring fixed per-paycheck transfer** `X` into the bills account, and
- an **optional one-time startup catch-up** for early underfunding.

It chooses between plans **lexicographically** (full policy in §6):

1. **Minimize the startup catch-up first** — prefer the plan needing the smallest
   up-front amount.
2. **Then minimize the recurring transfer** — within that minimum-catch-up plan,
   the smallest `X` that keeps the bills account at or above the cushion across a
   36-month simulation from the real starting balance.
3. If that `X <= paycheck`, use it. If `X > paycheck`, it is *not* automatically
   impossible: if the long-run average outflow per paycheck also exceeds the
   paycheck the plan is genuinely impossible (§11); otherwise it is a **timing
   problem** resolved by an affordable recurring transfer plus a larger startup
   catch-up (§6).

Two things the engine deliberately does **not** do: it does **not** globally
minimize the recurring transfer by allowing an arbitrarily large catch-up, and it
does **not** minimize the catch-up by recommending a recurring transfer larger than
one paycheck. The UI still shows a single answer: the recurring transfer, plus the
startup catch-up when one is needed.

It is **not** an average of bills. The recurring transfer is found by **binary
search over a day-by-day simulation** of the account, exploiting the fact that the
lowest projected balance rises monotonically as `X` increases.

Outputs:

- `X` — the recurring per-paycheck transfer chosen by the policy above (currency,
  internally to the cent).
- `yours` = `paycheck − X`.
- `startCatchUp` — one-time amount that must be put into the account up front to
  bridge **early** underfunding under the chosen transfer (before *or* after the
  first payday); see §6.
- `minBal`, `minDate` — lowest projected balance under the plan and when it occurs.
- `impossible` — true only when the long-run **average** outflow per paycheck
  exceeds the paycheck (genuine income shortfall), **not** merely when the steady
  transfer starts out above one paycheck; see §6 and §11.

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

> **At least one payday must fall inside the horizon.** A strictly valid `next`
> payday that is **after `horizonEnd`** (more than 36 months out) generates **zero**
> paydays, which makes the forecast and the `avg = totalOutflow / paychecksInHorizon`
> check undefined (division by zero). This is **rejected as invalid** — on live
> input, on import, and before any simulation or average is computed. Concretely:
> reject unless the schedule produces `paychecksInHorizon >= 1` (equivalently, the
> first generated payday is `<= horizonEnd`). The plain-language message: "Your next
> payday is too far in the future — pick a date within the next 3 years."

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

A one-time **"get this into the account now"** amount, needed whenever the bills
account would otherwise dip below the cushion **early** in the forecast — before
recurring transfers have had time to accumulate. A catch-up can be caused by:

- bills due **before the first payday**,
- **early bills after the first payday**, but before enough deposits have landed,
- **starting below the cushion** (including an overdrawn balance), or
- **any combination** of these.

> The bills-account balance is `billsAccountBalanceToday` (the prototype field name
> was `setAside`). It is the **actual** current balance and **may be negative** if
> the account is overdrawn; it must only be finite. See §7 and §12.

### Catch-up as a function of the recurring transfer

For a chosen recurring transfer `X`, the required catch-up is whatever one-time
top-up makes the **lowest point of the actual plan** reach the cushion:

```
requiredCatchUpForTransfer(X):
  low = simulate(X, billsAccountBalanceToday).minBal   # full 36-month timeline
  return max(0, cushion - low)                          # rounded UP to the cent
```

This **replaces** the earlier shortcut of simulating with an effectively infinite
transfer. That shortcut only measured the dip *before the first payday*
(`requiredCatchUpForTransfer(∞)`), because an infinite transfer makes every balance
after payday #1 huge — so it **missed early bills that land after the first payday**
and pushed their entire cost into the recurring transfer, sometimes spuriously
exceeding the paycheck. The catch-up must bridge the lowest point of the *real*
plan, wherever it falls.

### Plan selection policy

1. **Minimum-catch-up plan (normal case).** Let `catchUp₀ =
   requiredCatchUpForTransfer(∞)` (the pre-first-payday shortfall). Search the
   smallest steady transfer `X₀` such that, starting from
   `billsAccountBalanceToday + catchUp₀`, the simulation stays at or above the
   cushion (§7). If `X₀ <= paycheck`, **use `(X₀, catchUp₀)`** — the common path,
   which minimizes the upfront amount.
2. **Affordability check.** If `X₀ > paycheck`, do **not** immediately mark the plan
   impossible. Compute the long-run average outflow per paycheck:
   `avg = totalOutflow / paychecksInHorizon`.
   - If `avg > paycheck` → genuinely **impossible** (§11): over the full horizon,
     bills cost more than income.
   - If `avg <= paycheck` → a **timing / catch-up problem**, not an income problem:
     bills are front-loaded, but income covers them over time.
3. **Timing resolution.** Recommend a feasible recurring transfer
   `Xᵣ = min(paycheck, ceil(avg to the cent))` — the smallest long-run-sustainable
   transfer, so the user keeps the most each paycheck — and report the startup
   catch-up `requiredCatchUpForTransfer(Xᵣ)` that bridges the early gap.

**Decomposing the pre-first-payday need.** Because same-day bills apply before the
same-day paycheck (§5), a bill due **on or before** the first payday must be met with
no transfer yet landed. Define, in order:

- `preFirstPaydayOutflow` — total of all bill occurrences due **on or before** the
  first payday.
- `availableAboveCushion = max(0, billsAccountBalanceToday − cushion)` — the part of
  the current balance that sits **above the cushion** and can absorb those bills
  without breaching the floor. (Zero when the account is at, below, or overdrawn
  relative to the cushion.)
- `coveredByCurrentBalance = min(preFirstPaydayOutflow, availableAboveCushion)` — how
  much of the pre-first-payday outflow the current balance actually covers.
- `preFirstPaydayShortfall = max(0, preFirstPaydayOutflow − coveredByCurrentBalance)`
  — the pre-first-payday outflow the current balance does **not** cover.

The normal-branch startup catch-up is then
`preFirstPaydayShortfall + max(0, cushion − billsAccountBalanceToday)` — the
uncovered pre-payday bills **plus** any top-up needed to bring an at/below-cushion
account up to the cushion. (This equals `requiredCatchUpForTransfer(∞)`.) Do **not**
describe `billsAccountBalanceToday − deepest∞` as "covered by current balance" — only
`coveredByCurrentBalance` above is.

These quantities drive the adaptive **"Why this amount?"** copy:

- `coveredByCurrentBalance == preFirstPaydayOutflow > 0` and no cushion top-up → the
  current balance covers all bills due before/on the first payday, so **no catch-up**
  is needed and the leftover above-cushion balance slightly lowers `X`.
- `0 < coveredByCurrentBalance < preFirstPaydayOutflow` → the current balance covers
  **part** of the pre-first-payday bills; the remaining `preFirstPaydayShortfall` is
  the catch-up.
- `coveredByCurrentBalance == 0` → the current balance covers **none** of them
  (at/below cushion), so the catch-up is the full `preFirstPaydayOutflow` plus any
  cushion top-up.

When a catch-up is required, the two hero labels read **"…each paycheck after
setup."** The explanation is **cause-aware**: bills-before-first-payday (fully or
partially uncovered), early-bills-after-first-payday, below-cushion, or a
combination.

### Example — early underfunding is a timing problem, not "impossible"

- Paycheck: **$100 weekly**; starting balance `$0`; cushion `$0`.
- One bill: **$1,000 annual**, first due after **two** paychecks have landed.

Over 36 months there are 156 paychecks and the bill recurs 3× (total `$3,000`), so
`avg = 3000 / 156 ≈ $19.23` per paycheck — far below the $100 paycheck. But the
first $1,000 lands after only two deposits (~$40 accrued):

- The **old** infinite-transfer shortcut computes `startCatchUp = $0` and
  binary-searches a steady transfer of **$500** (> $100) → it would wrongly mark the
  plan **impossible**.
- The **corrected** logic sees `avg ≤ paycheck`, classifies this as **early
  underfunding**, recommends a recurring transfer of **$19.24 (shown as $20)**, and
  reports a **one-time startup catch-up of $961.52 (shown as $962)** that brings the
  lowest point exactly to the cushion. **Feasible, not impossible.**

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

A plan is impossible **only when income genuinely cannot cover the bills over the
full horizon** — i.e. when the long-run average outflow per paycheck exceeds the
paycheck:

```
avg = totalOutflow / paychecksInHorizon
impossible = paycheck > 0 && avg > paycheck
```

A steady transfer that merely *starts out* larger than one paycheck is **not**
sufficient to declare impossibility. When the minimum-catch-up transfer `X₀ >
paycheck` but `avg <= paycheck`, the plan is a **front-loading / timing problem**
resolved by a startup catch-up (§6), not an income shortfall — the engine must take
the timing-resolution path, not the impossible path.

When the plan truly is impossible, the engine reports `impossible = true` and the UI
must:

- Show **Yours = $0** (never a negative number).
- Show **"Bills need $X"** and **"Short by $(X − paycheck)" each paycheck**, where
  here `X = avg` (the long-run sustainable transfer the plan would require).
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
  weekly/biweekly/monthly; `next` not a strictly valid date; `next` strictly valid
  but generating **zero paydays inside the horizon** (i.e. `next > horizonEnd` /
  `paychecksInHorizon < 1`) — reject **before** any simulation or `avg` computation,
  same as live input (§3); `billsAccountBalanceToday` (prototype field: `setAside`)
  **not finite** — note it **may be negative** (an overdrawn account) and a negative
  value must **not** be rejected; `cushion` not finite or `< 0`.
- Any bill — reject if: `name` missing/empty; `amount` not finite or `<= 0`;
  `dueDate` not a strictly valid date; `freq` not one of monthly/quarterly/annual.
- **Optional debt fields (`balance`, `apr`) are optional on every bill.** Missing or
  blank `balance`/`apr` are **normalized to 0**, not rejected — an ordinary
  (non-revolving) bill with no `balance`/`apr` in the file is valid. Only when a
  value is **actually provided** (non-blank) must it be finite and `>= 0`, else
  reject. (Do not run the finite/`>= 0` check against a missing/blank field before
  the default applies.)
- **`stopWhenPaid`** is treated as `false` unless `showPayoff` is true.
- **Revolving debt (`showPayoff` true):** frequency is coerced to monthly. If
  `stopWhenPaid` is **also** true, `balance` is **required** — a blank/missing
  balance is **rejected** ("a paid-off forecast toggle needs a balance; use 0 if
  already paid off"); `balance` `0` (already paid off) or `> 0` is accepted. If
  `stopWhenPaid` is false, a blank/missing balance normalizes to 0 like any other
  bill.

On success, normalize: trim names, default missing/blank
`billsAccountBalanceToday`/`cushion`/`balance`/`apr` to 0, coerce `showPayoff` bills
to monthly frequency, and assign ids where missing. (Normalization of blank/missing
`balance`/`apr` happens **before** the finite/`>= 0` checks, so a normal bill
without those fields validates cleanly.)

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

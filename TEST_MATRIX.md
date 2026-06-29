# BillBuffer — Test Matrix

**Status:** Required coverage for the production engine + validation layers.
**Updated:** 2026-06-29

These tests are written against `CALCULATION_ENGINE_SPEC.md`. The engine and
validators must pass all of them **before any UI is wired** (Phase 3–4 of the
implementation brief). Inputs use the test-only "today" override; no UI control
ships for it.

> **Fixture note:** the regression anchor is **Fixture A**, a synthetic,
> non-personal scenario defined in `CALCULATION_ENGINE_SPEC.md` §13. All names and
> numbers are invented. No personal financial data is used or committed anywhere in
> this repo.

---

## A. Engine — correctness

| # | Test | Setup | Expected |
|---|------|-------|----------|
| A1 | **Fixture A — fixed-transfer regression scenario** | the synthetic fixture in `CALCULATION_ENGINE_SPEC.md` §13 (today 2030-01-01, $1,500 biweekly, start $0, cushion $0) | 79 paychecks; exact transfer $663.13 → **$664** into bills, **$836** yours; **$45** starting catch-up; lowest **$0** on **2030-01-02**; not impossible |
| A2 | **Zero bills** | valid paycheck, no bills | `X = 0`; yours = full paycheck; no catch-up; not impossible; "Why this amount?" hidden / empty-state copy shown |
| A3 | **Exact-dollar plan** | inputs that make the exact transfer land on a whole dollar | engine returns exactly that dollar (no float-ceil drift, no phantom +$1); bills display = yours + X = paycheck |
| A4 | **Monthly bill** | one $100 monthly bill | recurs every month from due date across horizon; transfer covers it with cushion held |
| A5 | **Quarterly bill** | one bill, freq = quarterly | recurs every 3 months from due date; transfer smooths the lumpy outflow over paychecks |
| A6 | **Annual bill** | one bill, freq = annual | recurs every 12 months; ~3 occurrences in 36 months; transfer pre-funds it |
| A7 | **Weekly paycheck** | freq = weekly | paydays at +7-day steps from next payday, no drift, through horizon |
| A8 | **Biweekly paycheck** | freq = biweekly | paydays at +14-day steps, no drift |
| A9 | **Monthly paycheck** | freq = monthly | paydays shifted by whole months with end-of-month clamping |

## B. Dates & recurrence edges

| # | Test | Setup | Expected |
|---|------|-------|----------|
| B1 | **Jan 31 monthly bill** | monthly bill due 2026-01-31 | occurrences clamp: Feb 28, Mar 31, Apr 30, … — measured from the original 31st each time (no permanent collapse to the 28th) |
| B2 | **Leap-year date** | bill/paycheck date 2028-02-29 | accepted; recurrence/horizon math handles the leap day correctly |
| B3 | **Invalid dates rejected** | dates 2026-02-31, 2026-02-29 (non-leap), 2026-13-01, "2026-1-1", "not-a-date" | each rejected by strict round-trip parser; not silently rolled |

## C. Validation — input & rules

| # | Test | Setup | Expected |
|---|------|-------|----------|
| C1 | **Negative cushion rejected** | cushion = −5 | rejected with clear message; state not saved |
| C2 | **Missing payday rejected** | paycheck with blank/invalid `next` | rejected; prompt to pick next payday |
| C3 | **Paycheck amount must be > 0** | amount = 0 or negative or non-finite | rejected |
| C4 | **Bill amount must be > 0** | bill amount = 0 / negative / NaN | rejected |
| C5 | **Bill name required** | blank name | rejected |
| C6 | **Negative balance / APR rejected** | balance = −1 or apr = −1 | rejected |

## D. Plan states

| # | Test | Setup | Expected |
|---|------|-------|----------|
| D1 | **Impossible plan** | bills whose required transfer exceeds one paycheck | `impossible = true`; Yours shows **$0** (never negative); "Bills need $X", "Short by $Y each paycheck"; forecast card + "why" hidden |
| D2 | **Same-day ordering: bill before paycheck** | a bill and a payday on the same date, balance tight | bill applied first; if that breaches the cushion, it is reflected (a same-day paycheck does not "rescue" a same-day bill) |
| D3 | **Starting catch-up required** | a bill due before payday #1 with start $0 | non-zero `startCatchUp` (rounded up); labels switch to "…after setup"; cause-aware explanation |
| D4 | **Existing balance covers pre-payday need** | start balance ≥ pre-first-payday outflow | no catch-up; leftover balance slightly lowers `X`; adaptive "why" copy |

## E. Revolving debt

| # | Test | Setup | Expected |
|---|------|-------|----------|
| E1 | **Debt payment ongoing by default** | card bill, `showPayoff = true`, `stopWhenPaid = false` | minimum payment counts as a normal monthly bill for the **entire** horizon; payoff estimate does not alter the forecast |
| E2 | **Stop-when-paid behavior** | card, `stopWhenPaid = true`, positive balance + APR + payment that pays off | bill contributes exactly `payoffMonths` monthly payments, then drops from the forecast |
| E3 | **Stop-when-paid, already paid off** | `stopWhenPaid = true`, balance = 0 | generates zero future payments |
| E4 | **Stop-when-paid, never pays off** | `stopWhenPaid = true`, payment ≤ monthly interest | stays ongoing full horizon; payoff UI reports "never pays off", not a fake date |
| E5 | **Card forced monthly** | `showPayoff = true` with freq set to quarterly/annual | frequency coerced to monthly on save and on import |
| E6 | **Stop-when-paid needs a balance** | `showPayoff` + `stopWhenPaid` with blank balance | rejected on save and on import ("use 0 if already paid off") |

## F. Import validation

| # | Test | Setup | Expected |
|---|------|-------|----------|
| F1 | **Valid round-trip** | export → delete everything → import same file | state restored losslessly |
| F2 | **Not a BillBuffer file** | random JSON / array / non-object | rejected; current data untouched |
| F3 | **Bad numbers** | NaN / Infinity / non-positive amounts | rejected with clear message |
| F4 | **Bad enums** | invalid `freq` (paycheck or bill) | rejected |
| F5 | **Bad dates** | invalid/impossible dates anywhere in the file | rejected |
| F6 | **Negative cushion in file** | cushion < 0 | rejected |
| F7 | **Stop-when-paid + blank balance in file** | as E6 but via import | rejected with the same message |
| F8 | **Normalization on success** | valid file with untrimmed names, missing apr/cushion, card with non-monthly freq | names trimmed, defaults applied, card coerced monthly, ids assigned |

## G. Privacy / offline (integration)

| # | Test | Setup | Expected |
|---|------|-------|----------|
| G1 | **Zero network for user data** | run full flow with network logging | no requests carry user data; works in airplane mode |
| G2 | **No personal data outside IndexedDB** | inspect storage after use | user data only in IndexedDB; nothing in localStorage/cookies/URL/logs |
| G3 | **Offline reload** | load once online, then offline | app shell loads and runs offline via service worker |

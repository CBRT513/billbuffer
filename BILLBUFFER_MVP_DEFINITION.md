# BillBuffer MVP v1.0

> **Reconciled to the locked architecture (2026-06-29).** This doc predates the
> frozen prototype and the production specs. Where it conflicts, the authoritative
> docs win:
> - **Calculation:** the "monthly-equivalent / averaging" pseudo-code below is
>   **superseded** by `CALCULATION_ENGINE_SPEC.md` — the engine is a binary-searched
>   smallest fixed transfer over a 36-month simulation, **not** an average.
> - **Pay frequencies:** weekly / biweekly / monthly only. **Twice-monthly is
>   removed** (a single "next payday" input can't anchor two fixed dates).
> - **Bill frequencies:** monthly / quarterly / annual only. **Semi-annual is
>   removed.**
> - **Bill timing:** a full **next due date**, not a day-of-month.
> - **Export/import:** now **in the MVP** (a core trust feature), not excluded.
> - **Stack:** static PWA + IndexedDB, no backend/auth/analytics/bank — see
>   `ARCHITECTURE_GUARDRAILS.md` and `BILLBUFFER_TECHNICAL_STACK.md`.

## The ONE Feature
Calculate per-paycheck bill allocation

## The ONE "Aha! Moment" We're Optimizing For
**"Seeing my money split: $X for bills, $Y for living"**
- Target: User experiences this within first 5 minutes
- Success Metric: User says "Oh, that's what I have left!"
- Measurement: Time from first launch to viewing split

## Core Components

### 1. Add Paycheck (One-Time Setup)
- Amount: $____
- Frequency: [Weekly|Bi-weekly|Monthly]   <!-- twice-monthly removed -->
- Next payday: [Date picker]
- Bills-account balance today + cushion (floor, default $0)
- DONE - Show split immediately

### 2. Add Bills (Core Repeatable Action)
- Name: [Text - no financial jargon]
- Amount: $____
- Next due date: [Date picker]   <!-- full date, not day-of-month -->
- Frequency: [Monthly|Quarterly|Annual]   <!-- semi-annual removed -->
- Credit card / revolving debt: [Optional checkbox]
- DONE - Update split in real-time

### 3. The Split View (The "Aha!" Screen)
- Big Number 1: "$X for Bills This Paycheck"
- Big Number 2: "$Y for Living"
- Visual: Simple progress bar (Bills|Living)
- Nothing else on this screen initially
- Secondary info (next paycheck date) subtle/gray

### 4. Onboarding (3 Screens Maximum)
- Screen 1: "This is NOT a budget app. BillBuffer answers ONE question: How much of my paycheck should I set aside for bills?"
- Screen 2: "No bank login needed. Works offline. We don't know you exist."
- Screen 3: "Include ALL your bills - even the quarterly water bill and annual registration" → [Start]

## Core Calculation Logic

> **Superseded by `CALCULATION_ENGINE_SPEC.md`.** The averaging pseudo-code below
> is kept only to show the original intent. The production engine does **not**
> average; it binary-searches the **smallest fixed per-paycheck transfer** that
> keeps the bills account at/above the cushion across a 36-month day-by-day
> simulation, plus a one-time starting catch-up when bills land before enough
> paychecks. Directional rounding: bills round up, "yours" rounds down.

```javascript
// ORIGINAL INTENT ONLY — NOT the production algorithm. See CALCULATION_ENGINE_SPEC.md.
monthlyEquivalent =
  monthlyBills +
  (quarterlyBills / 3) +
  (annualBills / 12) +
  creditCardMinimums

perPaycheckAmount =
  (monthlyEquivalent * 12) / numberOfPaychecksPerYear

billsMoney = perPaycheckAmount
livingMoney = paycheckAmount - perPaycheckAmount
```

## Explicitly EXCLUDED from MVP
❌ Multiple income sources
❌ Bill categories/tags
❌ Payment tracking/history
❌ Notifications/reminders (v1)
❌ Budgeting features
❌ Spending tracking
❌ Charts/graphs/analytics
❌ Bill pay or bank integration
❌ Social features/sharing
❌ Cloud sync (v1)
❌ User accounts/login
❌ Detailed bill management

<!-- Export/import moved INTO the MVP — it is the user's portability + a core trust
     proof for the Trust-Nothing persona. See PRODUCTION_IMPLEMENTATION_BRIEF.md. -->

## Success Criteria
- 5 out of 10 pilot users say "This reduces my anxiety"
- Users reach "aha moment" within 5 minutes
- Zero network requests during normal use
- Works completely offline
- Loads in <2 seconds

# BillBuffer MVP v1.0

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
- Frequency: [Weekly|Bi-weekly|Twice-monthly|Monthly]
- Next payday: [Date picker]
- DONE - Show split immediately

### 2. Add Bills (Core Repeatable Action)
- Name: [Text - no financial jargon]
- Amount: $____
- Due date: [Day of month]
- Frequency: [Monthly|Quarterly|Semi-Annual|Annual]
- Credit card minimum: [Optional checkbox]
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

```javascript
// Pseudo-code for the magic
monthlyEquivalent =
  monthlyBills +
  (quarterlyBills / 3) +
  (semiAnnualBills / 6) +
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
❌ Export (can add quickly if needed)

## Success Criteria
- 5 out of 10 pilot users say "This reduces my anxiety"
- Users reach "aha moment" within 5 minutes
- Zero network requests during normal use
- Works completely offline
- Loads in <2 seconds

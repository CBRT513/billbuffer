# BillBuffer Open Questions

## 1. Business Model Specifics

**Current Decision:** Freemium model
- Basic split calculation: Free forever
- Premium features: ~$2.99/month

**Questions to Resolve:**

**What exactly stays free forever?**
- Just the basic split calculation?
- How many bills can free users add?
- Are all bill frequencies available in free?

**What triggers the premium upgrade?**
- Multiple income sources?
- Cloud backup?
- Reminders/notifications?
- Export features?

**Early adopter benefits?**
- Premium free for life?
- Discounted rate?
- Special recognition?

## 2. MVP Feature Boundaries

**Questions to Resolve:**

**Credit card handling in v1?**
- Just minimum payments?
- Option for "target payment" amounts?
- How to distinguish from regular bills?

**Bill entry UI for different frequencies?**
- Separate forms for each frequency?
- One form with frequency selector?
- Quick templates for common bills?

**Manual entry friction reducers?**
- "Same as last month" option?
- Common bill templates?
- Smart defaults?
- Future: OCR/photo capture?

## 3. The Perfect Elevator Pitch

**Current Options:**
1. "Airplane mode for your finances"
2. "Know what you need to spend in order to know how you can live"
3. "Financial clarity, offline"
4. "We don't know you exist"
5. "BillBuffer tells you exactly what money is for bills and what's yours to spend. No budgeting, no tracking, just the split."
6. "The financial app for people who don't trust financial apps"

**Question:** Which resonates most? Or do we need something different?

## 4. Trust Verification Methods

**How do we PROVE our privacy claims?**
- Open source the code?
- Third-party security audit?
- "Privacy Report" feature showing what we don't collect?
- Video showing network tab with zero requests?
- Bounty program for finding privacy violations?

## 5. Technical Implementation Details

**Calculations:**
- Exact proration formula for bills?
- How to handle pay periods that don't align with months?

**Edge cases:**
- Paid weekly but bills monthly?
- Paid on specific dates (1st and 15th)?
- Variable income?

**Progressive Disclosure:**
- What shows immediately vs. on tap?
- How to indicate more info available?
- Gesture patterns for revealing/hiding?

**Data Structure:**
- How to store bills efficiently?
- Optimization for quick recalculation?
- Migration strategy as features added?

## 6. Success Metrics

**Primary Metric:** "% of users who say BillBuffer reduced their financial anxiety"

**Secondary Metrics to Define:**
- What constitutes "active" use?
- How to measure anxiety reduction objectively?
- When do we survey users?
- What's minimum viable retention?

## 7. User Acquisition Strategy

**Questions:**

**Start with which persona?**
- Trust-Nothing users (underserved)?
- Anxious Avoiders (largest market)?
- Smart Lazy (easiest to relate)?

**Where do these users congregate?**
- r/ADHD, r/anxiety?
- Privacy-focused forums?
- Financial anxiety support groups?

**Launch strategy?**
- Quiet beta with 10 users?
- ProductHunt launch?
- Reddit soft launch?

## 8. Critical Technical Decisions

**PWA vs Native:**
- Start with PWA (decided)
- When/if to build native?
- What would trigger that decision?

**Offline-First Architecture:**
- How to handle future sync features?
- Conflict resolution if multi-device?
- Backup without compromising privacy?

---

## Notes
These questions don't all need immediate answers, but having them documented ensures we're thinking about them as we build.

**Priority questions for next session:**
1. Exact MVP feature list
2. Elevator pitch finalization
3. Initial user acquisition channel

# BillBuffer Privacy Manifesto

## Core Principle: "We Don't Know You Exist"

Once you download BillBuffer, we don't know you exist.

We can't sell what we don't have.
We can't track what we can't see.
We can't leak what we never collected.

You're not our user.
You're the owner of a calculator that happens to remember bills.

## The Airplane Mode Promise

**JUST LIKE AIRPLANE MODE:**
✅ Everything works without connection
✅ Your data stays on your device
✅ No signals out, no tracking in
✅ Complete functionality offline
✅ You choose when/if to connect
✅ Peace through disconnection

**THE REVELATION:**
"Your money info doesn't need the internet.
It needs to be safe from the internet."

## Zero-Knowledge Architecture

### Technical Requirements

**MANDATORY:**
1. FULL offline functionality
2. NO accounts — ever
3. NO analytics or tracking — none, not even opt-in
4. NO third-party libraries that phone home
5. NO background network requests
6. NO user data leaves the device

### Trust Indicators (Visible in App)
- "✈️ Offline Mode" indicator
- "Last sync: Never" (and that's fine)
- "Data location: This device only"
- Network usage indicator when active
- Clear data export button
- Clear data delete button

## The Trust-Nothing User Persona

**WHO THEY ARE:**
- Been burned by data breaches
- Reads every permission request
- Uses cash when possible
- Suspicious of "free" apps
- Knows nothing is really private
- Still has bills to manage

**THEIR FEARS:**
- "Apps sell my data"
- "Hackers will get my bank info"
- "They're watching my spending"
- "AI is learning my patterns"
- "Nothing is really deleted"

**WHAT THEY'D NEVER DO:**
❌ Connect bank accounts
❌ Use Mint/YNAB/banking apps
❌ Trust "bank-level encryption" claims
❌ Believe "we don't sell your data"
❌ Put real numbers in most apps

## Privacy-First Design Patterns

### Onboarding
First screen: "BillBuffer works offline.
              No account needed.
              No bank connection.
              Ever."

### Permissions
- Never ask for contacts
- Never ask for location
- Only notifications if user initiates
- Explain EVERYTHING

### Settings Screen
Top item: "Your Privacy"
- Data stored: Local only ✓
- Bank connections: None ✓
- Tracking: Disabled ✓
- Export your data →
- Delete everything →

## The Privacy Report Feature

Button: [See What We Know About You]

Shows:
- Number of bills: 23
- Number of paychecks: 2
- Days using app: 47
- Storage used: 1.2MB
- Data shared: NOTHING
- Network requests: ZERO
- Your identity: UNKNOWN

"This is all we know. This is all we'll ever know. Unless you choose otherwise."

## Data Principles

**USER OWNS:**
- All financial data
- All settings
- Export anytime
- Delete anytime

**WE NEVER SEE:**
- Dollar amounts
- Bill names
- Personal details
- How many bills you have, or which features you use
- Anything at all — there are no network requests to see it through

> **Reconciled (2026-06-29):** an earlier draft listed "anonymous" usage we
> "might see" (bill counts, frequency types, feature usage, opt-in crash reports).
> That contradicted the "Network requests: ZERO" promise and the no-analytics
> guardrail, so it was removed. The locked architecture has **no analytics of any
> kind**, opt-in or otherwise. See `ARCHITECTURE_GUARDRAILS.md`.

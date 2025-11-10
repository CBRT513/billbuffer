# BillBuffer Technical Stack

## Current Technical Decisions

### Stack
**Frontend: PWA (Progressive Web App)**
- Single codebase for all platforms
- Installable like native app
- Works offline by design
- No app store requirements

**Backend: Node.js/Express on Render**
- Minimal backend for future features
- Handles optional cloud backup
- No user data stored on servers

**Database:**
- Local: IndexedDB (primary)
- Server: Neon Postgres (for optional features only)

**Encryption: AES-256**
- Full database encryption (not field-level)
- Encryption happens on device
- Keys never leave device

**Auth:**
- None required for MVP
- Future: Optional email/magic link for backup

## Performance Requirements
- First paint: <1 second
- Interactive: <2 seconds
- Calculation: Instant (<100ms)
- Works on 3G connection
- Works on 3-year-old phones
- Handles 10 or 100 bills equally well

## Privacy Requirements
- FULL offline functionality
- NO required account creation
- NO analytics unless explicitly opted-in
- NO third-party libraries that phone home
- NO background network requests
- VISIBLE when app uses network (if ever)

## Development Constraints
- Solo developer
- Zero budget
- Must be maintainable by "lazy genius"
- Prefer boring, stable technology
- No complex build processes
- Iterate quickly based on user feedback

## Infrastructure (Already Set Up)
- Google Workspace (abandoned Firebase due to phishing flags)
- Render (hosting)
- Docker (containerization)
- Neon (Postgres database)
- Domain: billbuffer.com (presumably)

## Future Considerations
- Optional Google Drive backup ("BYO Cloud")
- PWA → Native app (only if needed)
- SendGrid or similar for magic links (if auth added)
- Plausible Analytics (privacy-focused, if user opts in)

## Development Principles

### "Boring is Beautiful"
- No animations to break
- No trends to maintain
- No social features to moderate
- Just math that works

### Build for Maintenance
- If the founder won't maintain it, neither will users
- Every feature = future maintenance debt
- Choose carefully

### Simplicity Over Features
- Better to do one thing perfectly
- Than many things adequately
- The ONE thing: Calculate bill/living split

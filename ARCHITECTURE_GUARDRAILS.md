# BillBuffer — Architecture Guardrails

**Status:** Locked. These are non-negotiable for the MVP.
**Updated:** 2026-06-29

These guardrails exist to stop "backend creep" — the slow drift from a private,
on-device tool toward infrastructure that quietly breaks the core promise:
**we don't know you exist.** If a proposed change violates a guardrail below,
the change is wrong, not the guardrail. Changing a guardrail is a founder-level
decision, made in writing, not a default an implementer reaches for.

---

## Hard guardrails (MVP)

1. **No backend for MVP.** No application server, no API we operate, no
   serverless functions that touch user data. The app is files served statically.
2. **No accounts.** No sign-up, no profiles, no user records anywhere.
3. **No authentication.** No login, no passwords, no magic links, no OAuth, no SSO.
4. **No user financial data leaves the device.** Bills, paycheck, balances, and
   forecasts stay in on-device storage. Zero network requests carry user data.
   The app must work fully in airplane mode.
5. **No analytics or tracking.** No Plausible, no GA, no pixels, no crash
   telemetry, no "anonymous" usage counts. Nothing phones home.
6. **No bank connections.** No Plaid, no aggregators, no card/account linking,
   no transaction import from financial institutions.
7. **Static PWA only.** Installable, offline-first Progressive Web App served as
   static assets from a CDN/static host that stores no user data.
8. **IndexedDB local storage.** All persisted user data lives in IndexedDB on the
   device. (The prototype used `localStorage`; production uses IndexedDB.)
9. **Export / import required.** The user can export all their data to a local
   JSON file and import it back. This is the user's only "sync" and their proof
   that the data is theirs and portable. It is in-scope for MVP, not a later add.
10. **The prototype is not production code.** `billbuffer-prototype.html` is a
    disposable UX + calculation test model. Production is rebuilt from the specs
    in this repo. Prototype code is never copied into production, and the
    prototype (which embeds personal seed data) is never committed.

---

## What this means in practice

- A "small convenience" that adds a network call for user data is a guardrail
  violation, even if it's optional or opt-in.
- "We could add accounts later for multi-device sync" is a future-philosophy
  question, not an MVP task. Park it; don't build toward it.
- Encryption-at-rest, key handling, or any security claim must be honest about
  the no-account model (there is no server-held key) before it ships.
- Hosting may use a CDN and a service worker; neither may log or store user data.

## Allowed (not a violation)

- Static asset hosting and a service worker for offline app-shell caching.
- IndexedDB reads/writes on-device.
- Local file export/import initiated by the user.
- Privacy-preserving, self-contained client-side computation (the forecast engine).

See `PRODUCTION_IMPLEMENTATION_BRIEF.md` for the build, `BILLBUFFER_TECHNICAL_STACK.md`
for the stack, and `CALCULATION_ENGINE_SPEC.md` for the engine these guardrails protect.

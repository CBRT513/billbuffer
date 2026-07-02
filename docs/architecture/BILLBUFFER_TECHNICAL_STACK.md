# BillBuffer — Technical Stack

**Status:** Locked for MVP. **Updated:** 2026-06-29

This replaces the earlier stack doc, which specified a backend (Render / Node /
Neon Postgres), accounts/auth, and analytics — all of which contradicted the
product's own privacy philosophy. The MVP stack below is unambiguous and matches
`ARCHITECTURE_GUARDRAILS.md`. Backend, cloud, auth, and analytics ideas are not
deleted — they are fenced into "Explicitly not MVP" at the bottom, each with its
privacy trade-off named, so nobody mistakes them for current architecture.

---

## MVP stack

| Layer | Choice | Notes |
|---|---|---|
| **Framework** | **SvelteKit + TypeScript** | App framework; typed throughout. |
| **Build target** | **Static site** | `@sveltejs/adapter-static`, prerendered, SPA fallback. No SSR, no server runtime. |
| **Runtime** | **Static PWA** | Installable, offline-first Progressive Web App. |
| **Storage** | **IndexedDB** | All user data on-device only. (Prototype used `localStorage`; production uses IndexedDB.) |
| **Calculation** | Pure client-side TypeScript | The fixed-transfer forecast engine; see `CALCULATION_ENGINE_SPEC.md`. |
| **Export/Import** | Local JSON file | User-initiated; validated on import. The only data portability path. |
| **Hosting** | Static host / CDN | Serves static assets only; stores no user data and logs nothing personal. |
| **Backend** | **None** | No API we operate. |
| **Database (server)** | **None** | No server database. |
| **Auth** | **None** | No login, accounts, magic links, OAuth, or SSO. |
| **Analytics** | **None** | No tracking, telemetry, or "anonymous" usage counts. |
| **Bank connections** | **None** | No Plaid/aggregators/transaction import. |

### Why this stack

- **SvelteKit + adapter-static** ships a small, fast app as plain static files — no
  server to operate means no server that can hold or leak user data.
- **IndexedDB** is the right on-device store for structured records (bills,
  paycheck, schema version) and scales past `localStorage`'s limits.
- **PWA + service worker** delivers install + true offline (airplane-mode) behavior
  without any backend.
- **Local JSON export/import** gives the user portability and a trust proof without
  cloud sync.

### Server-side user data

**None.** No user financial data is transmitted, stored, or processed off-device.
The static host and CDN see only requests for static assets, never user data.

---

## Explicitly NOT MVP — future only if the privacy philosophy changes

Everything here is **out of scope** and would require a deliberate, written
founder-level decision because each one weakens "we don't know you exist." Listed
so the ideas aren't lost — **not** as a roadmap.

| Idea | What it would add | Privacy trade-off it introduces |
|---|---|---|
| Backend API (e.g. Node/Express on Render) | A server we operate | Creates an off-device place user data can live or pass through |
| Server database (e.g. Neon Postgres) | Central storage | User financial data leaves the device |
| Accounts + auth (email / magic link / OAuth / SSO) | Identity, multi-device | We would now "know you exist"; requires storing identifiers |
| Multi-device sync / cloud backup | Cross-device data | Data must transit and rest off-device |
| Analytics (e.g. Plausible) / crash telemetry | Usage insight | Network requests leave the device; breaks "zero network" promise |
| Bank connections (e.g. Plaid) | Auto-imported transactions | Connects to financial institutions; large new data-exposure surface |
| Email/notifications (e.g. SendGrid) | Reminders | Requires contact info + a server to send from |
| Server-side or account-bound encryption | "Encryption at rest" claims | With no account there is no server-held key; any such claim must be honest about the on-device key model before it ships |

If any of these is ever reconsidered, update `ARCHITECTURE_GUARDRAILS.md` first —
the guardrails are the gate, this table is just the parking lot.

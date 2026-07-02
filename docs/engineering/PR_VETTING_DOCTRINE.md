# BillBuffer Engineering & PR-Vetting Doctrine  *(FROZEN 2026-07-02)*

**Subject:** How BillBuffer protects its promises, and how pull requests are vetted in GitHub
**Repo:** CBRT513/billbuffer
**Prepared for:** CTO review (Clif)
**Date:** 2026-07-02
**Structure note:** This brief is organized in three layers — *promises that never change*, *CI responsibility that rarely changes*, and *current implementation expected to evolve*. When those get permanent homes (Product Bible, Architecture Guardrails, engineering philosophy, implementation guide), each layer moves to its own; the layer is marked below.

---

## 1. The lens: trust in one number

BillBuffer succeeds or fails on whether people trust one number. The calculation engine exists to produce that number. Everything else — the UI, the storage, the offline support — exists to protect trust in it.

That is the lens for every future decision, every test priority, and every merge. If the UI is ugly, the app is still useful. If the calculation is wrong once, trust is gone. Hold this while reading the rest.

---

## 2. Product Promises — *never change* (→ Product Bible / Architecture Guardrails)

BillBuffer makes exactly three promises to its users:

1. **The number is correct.**
2. **Your data is yours.** (It never disappears, and it never leaves your device.)
3. **The app works without the internet.**

These do not change. Not for a feature, not for a deadline, not for a nice-to-have. **If a feature weakens any promise, the feature loses.** Everything downstream — the engineering philosophy, the CI, the review process — exists to protect these three.

*(Externally these are "promises." Internally, alongside the architectural constraints below, they are the project's invariants.)*

---

## 3. Product Invariants — *never change without an explicit architecture decision* (→ Architecture Guardrails)

Distinct from the promises (which are commitments to the user), these are the architectural constraints that keep those promises cheap to keep. The following may never change without a documented architecture decision:

- Local-first
- No accounts
- No backend
- No analytics / no telemetry
- No bank connections
- One primary question
- One primary answer
- One recurring transfer + optional startup catch-up

This is the direct analog of CBRTConnect's invariants (e.g. "MTLO models frozen," "a BOL must never change after cutover"). The invariant doesn't move; the implementation beneath it does. When someone six months from now asks "can we just add accounts / a little analytics / a backend sync," this section is the answer, and the answer is: only through an explicit, documented architecture decision — not a casual PR.

**Prototype freeze:** The HTML prototype is frozen. Production behavior may only change through documented architecture decisions and regression tests — never by copying from the prototype. (Otherwise, six months from now, someone asks "can we just copy this from the prototype?" and the drift begins.)

---

## 4. CI Responsibility — *rarely changes* (→ engineering philosophy)

**CI exists to continuously verify the three Product Promises before any code reaches `main`.**

That sentence is the whole engineering philosophy for BillBuffer's pipeline. It does not name tools, test frameworks, or job counts — those live one layer down and are expected to change. What does not change is the responsibility: no code merges to `main` without CI having re-proven that the number is correct, the data is safe, and the app works offline.

Branch protection is what turns this responsibility into enforcement (Section 6).

---

## 5. Current Implementation — *expected to evolve* (→ implementation guide)

Today, CI verifies the three promises using the checks below, run fast-to-slow so cheap failures surface early. **This list is expected to grow.** If accessibility testing, Lighthouse, visual-regression, mutation testing, or browser-compat tests get added later, they are added *here* — the promises and the CI responsibility above stay untouched.

**Fast gates (seconds):**
- **Type-check** (`svelte-check`) — catches TypeScript/Svelte errors the build alone misses.
- **Lint / format** — quick correctness pass.

**Build:**
- **`vite build` / adapter-static** — proves the site builds clean in CI, ahead of the host's own deploy build.

**Promise-protecting test suites — each maps to a promise:**
- **Calculation-engine unit tests** → *protects "the number is correct."* The first check to stand up and the one that must always pass. Vitest fits a Vite/SvelteKit project.
- **Import/export round-trip validation** → *protects "your data is yours."* Because storage is local-only, import/export is the only way data survives a cleared browser or moves between devices. Test: export → import → assert identical. A silent corruption here is permanent, unrecoverable data loss.
- **PWA / offline smoke tests** → *protects "works without the internet."* Playwright drives a headless browser, goes offline, and asserts the app still loads and works from the service worker + IndexedDB.

**Preview deployment:**
- Netlify / Cloudflare Pages build a per-PR preview URL automatically. **The bar: every pull request should produce a preview URL that can be installed on a phone and used by a non-developer. If you can't hand that URL to someone and have them use the app, the PR isn't finished.** (Standard for feature PRs; not a blocking gate on a one-line fix.)

**Codex review:**
- **Codex is the final skeptical reader.** Tests verify expected behavior; Codex looks for the behavior nobody thought to test — especially BillBuffer's one untrusted-input surface: **parsing user-supplied import files.** It does not auto-fire; post `@codex review` when the PR is ready.

---

## 6. Branch protection — the enforcement layer

CI only vets if it can't be bypassed. On the default branch:

- **Required status checks** = the CI jobs (must be green to merge).
- **Require branch up to date** before merging.
- **Require 1 approving review** (yours counts).

One-time GitHub UI setting. Without it, every check above is advisory and gets skipped on a tired night.

---

## 7. Where CI runs, and why not the vault

Run BillBuffer's CI on **GitHub-hosted runners**, not the vault01 self-hosted fleet.

The vault exists for CBRTConnect's heavy `django-tests` (Postgres 16 + Playwright + `sudo apt`). BillBuffer's tests are Node-based and finish in under a minute on free hosted runners. Self-hosting this stack would add real downside for no gain: the classic vault runner executes jobs as a **sudo-capable user** — a genuine exposure for financial-adjacent code — plus Coolify maintenance overhead. Keep the vault reserved for CBRTConnect's heavy jobs and the Frigate camera project, the workloads that actually justify the box.

---

## 8. The pipeline, end to end

```
PR opens
  → CI runs: type-check → lint → build → calc-engine tests → import/export tests → PWA/offline tests
  → host builds a phone-installable preview URL
  → you post @codex review
  → you (or a non-dev) install the preview and check it offline
  → merge only when CI is green AND the preview has been used
Branch protection makes "CI green" non-optional.
```

---

## 9. What to deliberately leave out

The failure mode for a light stack is over-building the process. For now, skip: Python security scanners (CBRTConnect's tooling, not applicable); coverage thresholds (calc-engine and import/export are pure functions — write the tests that matter, don't chase a percentage); integration-test infrastructure (no backend, no integration surface); multiple mandatory reviewers (you're solo/small). Keep `npm`/`pnpm audit` **non-blocking** — JS transitive-dep noise will red-flag PRs over things you can't fix, training you to ignore the gate. Add strictness when BillBuffer has users and outside contributors, not before.

---

## 10. Recommendation and the honest next move

The doctrine above is sound and ready to become the operating document. It is a single CI workflow file (`.github/workflows/ci.yml`) plus a one-time branch-protection setup — a clean, low-risk, single-session job. Stand up the **calculation-engine tests as the first required check**, then layer in the rest.

**The honest CTO caution:** every improvement in this brief is another document edit, and documentation is the satisfying part. You now have the vision, guardrails, invariants, calculation spec, CI strategy, review strategy, and branch protection — everything a professional product has *before* implementation. The next milestone is categorically different from everything so far: **Build Production v1. Not another document. The actual application, one small PR at a time.** Timebox any further doctrine polish to one sitting; then the next BillBuffer action should be a CC handoff that produces code.

**Implementation order.** Build in this sequence, and each new promise-protecting suite becomes a required status check before the next feature branch is allowed to merge:

1. Calculation-engine tests
2. CI workflow + branch protection
3. Import/export round-trip tests
4. Offline / PWA tests

This order is correct whether or not the suites exist today: if a suite already exists, step one for it is wiring it into CI; if it doesn't, step one is writing it. Either way, no feature branch merges until the promise it touches is protected by a green check.

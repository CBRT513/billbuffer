// BillBuffer app-data domain model — the production record persisted on-device.
//
// The domain PRIMITIVES (Paycheck, Bill, Frequency, BillFreq) are owned by the
// calculation engine (src/lib/engine/types.ts, exposed via $lib/engine) and are the
// single source of truth for those shapes — matching
// docs/engineering/PRODUCTION_IMPLEMENTATION_BRIEF.md §4. We re-export them here so
// the rest of the app has one import point for app-wide types, and add only the
// AppData container the engine itself does not need.
//
// This module is PURE: no browser, IndexedDB, or SvelteKit imports (enforced by
// src/lib/architecture.test.ts). Storage versioning (schemaVersion) is a persistence
// concern held in src/lib/storage/schema.ts, deliberately kept off AppData.

export type { Paycheck, Bill, Frequency, BillFreq } from './engine';

import type { Paycheck, Bill } from './engine';

/**
 * The full on-device record. Mirrors PRODUCTION_IMPLEMENTATION_BRIEF.md §4 exactly.
 *
 * Deliberately absent: no `testToday` (a prototype/test-harness date override that is
 * never persisted — CALCULATION_ENGINE_SPEC.md §2/§12), and no `schemaVersion` (a
 * storage concern held in the persistence envelope — see storage/schema.ts). The sole
 * "setting", `cushion`, lives on `Paycheck` per §4; there is no separate settings
 * object because the spec defines none.
 */
export interface AppData {
	onboarded: boolean;
	paycheck: Paycheck | null;
	bills: Bill[];
}

/** A fresh, first-run record: not onboarded, no paycheck, no bills. No product logic. */
export function emptyAppData(): AppData {
	return { onboarded: false, paycheck: null, bills: [] };
}

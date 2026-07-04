// Storage schema: the versioned persistence envelope and the tolerant read/write
// normalization at the storage boundary.
//
// This module is PURE (no IndexedDB, no browser) so it is unit-testable and so the
// engine-facing domain (src/lib/types.ts) never has to carry a storage version.
//
// Scope of the normalization here: PRODUCTION_IMPLEMENTATION_BRIEF.md §5 requires
// reads to "tolerate an empty/first-run store and a partially-populated store
// (onboarded but no paycheck, paycheck but no bills)." So this coerces STRUCTURE to
// a well-formed AppData and never aliases the source graph. It is NOT the import
// validator (CALCULATION_ENGINE_SPEC.md §12) — it does not reject bad field values
// or run date/finite/positivity checks; that is the validation-layer PR's job.

import type { AppData, Bill, Paycheck } from '$lib/types';
import { emptyAppData } from '$lib/types';

/** On-disk schema version. Bump + add a migration branch in `fromStored` when the
 *  persisted shape changes so old records upgrade without data loss (brief §5). */
export const SCHEMA_VERSION = 1;

/** The record actually written to IndexedDB: a versioned wrapper around AppData. */
export interface StoredAppData {
	schemaVersion: number;
	data: AppData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Structurally clone a nested plain object as-is. Field-level correctness is the
// validation layer's concern; here we only guarantee the returned graph does not
// alias the input, so a caller mutating its object later cannot reach stored state.
function cloneValue<T>(value: T): T {
	return structuredClone(value);
}

function normalizePaycheck(raw: unknown): Paycheck | null {
	// Tolerate "onboarded but no paycheck": anything that is not a plain object
	// becomes null rather than throwing. Fields are cloned, not validated.
	return isRecord(raw) ? (cloneValue(raw) as unknown as Paycheck) : null;
}

function normalizeBills(raw: unknown): Bill[] {
	// Tolerate "paycheck but no bills" and a missing/legacy bills field: only a real
	// array contributes, and only its plain-object entries survive.
	if (!Array.isArray(raw)) return [];
	return raw.filter(isRecord).map((bill) => cloneValue(bill) as unknown as Bill);
}

/**
 * Build a well-formed, independent AppData from arbitrary input.
 *
 * Used on both the read path (unwrapping a stored/legacy record) and the write path
 * (defensive clone before persisting), so neither can alias caller state. Missing or
 * wrong-typed structure falls back to the empty first-run shape.
 */
export function normalizeAppData(raw: unknown): AppData {
	if (!isRecord(raw)) return emptyAppData();
	return {
		onboarded: raw.onboarded === true,
		paycheck: normalizePaycheck(raw.paycheck),
		bills: normalizeBills(raw.bills)
	};
}

/**
 * Read side: turn whatever is on disk into an AppData.
 *
 * Accepts the current envelope `{ schemaVersion, data }`, a bare legacy record
 * (the scaffold stored AppData directly), and empty/undefined first-run stores. Add
 * per-version migration branches here as `SCHEMA_VERSION` advances.
 */
export function fromStored(raw: unknown): AppData {
	if (isRecord(raw) && 'schemaVersion' in raw && 'data' in raw) {
		// Only v1 exists today; future versions branch on raw.schemaVersion here.
		return normalizeAppData(raw.data);
	}
	// Bare record (legacy) or empty/first-run store.
	return normalizeAppData(raw);
}

/** Write side: wrap AppData in the current-version envelope, cloned so the stored
 *  graph never aliases the caller's object. */
export function toStored(data: AppData): StoredAppData {
	return { schemaVersion: SCHEMA_VERSION, data: normalizeAppData(data) };
}

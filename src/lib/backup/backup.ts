// Local JSON export/import — the PURE half: serialize an AppData to backup text, and
// parse+validate backup text back into an AppData through the SHARED validator
// (src/lib/validation). No browser, no IndexedDB — so the whole round-trip is testable
// without any UI. The browser download/upload + persistence live in
// src/lib/storage/importExport.ts.
//
// Export shape is the plain AppData the validator consumes (brief §6), NOT the storage
// envelope — so an exported file re-imports straight through validateAppData, and the
// storage layer re-wraps it with the current schema version on save.

import type { AppData } from '$lib/types';
import type { ValidateOptions, ValidationResult } from '$lib/validation/validate';
import { validateAppData } from '$lib/validation/validate';

/** The single, stable backup filename (brief §6). */
export const BACKUP_FILENAME = 'billbuffer-backup.json';

/**
 * Serialize AppData to pretty-printed backup JSON.
 *
 * Builds a canonical object from KNOWN fields only, so (a) no test-only or stray key
 * (e.g. `testToday`) can ever leak into a backup, and (b) equal AppData always yields
 * byte-identical output (deterministic).
 */
export function serializeAppData(data: AppData): string {
	const clean = {
		onboarded: data.onboarded,
		paycheck: data.paycheck
			? {
					amount: data.paycheck.amount,
					freq: data.paycheck.freq,
					next: data.paycheck.next,
					billsAccountBalanceToday: data.paycheck.billsAccountBalanceToday,
					cushion: data.paycheck.cushion
				}
			: null,
		bills: data.bills.map((bill) => ({
			id: bill.id,
			name: bill.name,
			amount: bill.amount,
			dueDate: bill.dueDate,
			freq: bill.freq,
			showPayoff: bill.showPayoff,
			balance: bill.balance,
			apr: bill.apr,
			stopWhenPaid: bill.stopWhenPaid
		}))
	};
	return JSON.stringify(clean, null, 2);
}

/**
 * Parse backup text and validate/normalize it through the shared validator.
 * Malformed JSON is a normal rejection (not a thrown error), so callers get one
 * uniform `ValidationResult` for every failure mode and can leave current data intact.
 */
export function parseBackup(text: string, options: ValidateOptions): ValidationResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return { ok: false, errors: ['This file is not valid JSON.'] };
	}
	return validateAppData(parsed, options);
}

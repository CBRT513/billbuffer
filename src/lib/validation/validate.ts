// Shared production validation + normalization layer (CALCULATION_ENGINE_SPEC.md §12).
//
// One strict gate for BOTH imported files and live-input-shaped AppData, run BEFORE
// anything is persisted or forecast. It rejects invalid data VISIBLY (a list of
// plain-language messages) and never silently drops it; on success it returns a fresh,
// deterministically-normalized AppData. It is PURE — no browser, no IndexedDB, no
// clock read ("today" is an explicit input, like the engine) — so it is exhaustively
// testable and reused unchanged in Node, Vitest, and the browser.
//
// This is distinct from storage/schema.ts `normalizeAppData`, which only *tolerates*
// partial persisted state (§5). Here the rules REJECT. Date validity and the
// payday-in-horizon check reuse the engine's own primitives so the validator and the
// forecast always agree on what "valid" means.

import type { AppData, Bill, BillFreq, Frequency, Paycheck } from '$lib/types';
import { generatePaydays, horizonEnd, parseIsoDate } from '$lib/engine';
import type { CivilDate } from '$lib/engine';

const PAYCHECK_FREQS: readonly Frequency[] = ['weekly', 'biweekly', 'monthly'];
const BILL_FREQS: readonly BillFreq[] = ['monthly', 'quarterly', 'annual'];

/** Plain-language message reused verbatim from the spec/test-matrix (C8/§3, F13). */
const NEXT_TOO_FAR =
	'Your next payday is too far in the future — pick a date within the next 3 years.';
/** Plain-language message reused verbatim from the spec (§12, F7/E6). */
const NEEDS_BALANCE = 'a paid-off forecast toggle needs a balance; use 0 if already paid off';

export interface ValidateOptions {
	/**
	 * "Today" reference (strict "YYYY-MM-DD") for the payday-in-horizon rule.
	 * Production passes the current local date; tests inject a fixed date. This is a
	 * caller/system value, NOT user data — a malformed value is a programming error and
	 * throws (unlike the `testToday` field inside a payload, which is user data and is
	 * rejected as a validation failure).
	 */
	readonly today: string;
}

export type ValidationResult =
	| { readonly ok: true; readonly value: AppData }
	| { readonly ok: false; readonly errors: readonly string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Absent / null / empty-or-whitespace string — the fields the spec calls "blank". */
function isBlank(value: unknown): boolean {
	return (
		value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
	);
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isPaycheckFreq(value: unknown): value is Frequency {
	return typeof value === 'string' && (PAYCHECK_FREQS as readonly string[]).includes(value);
}

function isBillFreq(value: unknown): value is BillFreq {
	return typeof value === 'string' && (BILL_FREQS as readonly string[]).includes(value);
}

function isValidIsoDate(value: unknown): value is string {
	return typeof value === 'string' && parseIsoDate(value) !== null;
}

/**
 * Validate + normalize arbitrary input into an AppData.
 *
 * @throws {TypeError} if `options.today` is not a strict "YYYY-MM-DD" date (caller bug).
 */
export function validateAppData(raw: unknown, options: ValidateOptions): ValidationResult {
	const todayCivil = parseIsoDate(options.today);
	if (!todayCivil) {
		throw new TypeError(
			`validateAppData: options.today must be "YYYY-MM-DD", got: ${options.today}`
		);
	}
	// horizonEnd() only ever returns a valid ISO date for a valid input.
	const endCivil = parseIsoDate(horizonEnd(options.today)) as CivilDate;

	const errors: string[] = [];

	if (!isRecord(raw)) {
		return { ok: false, errors: ['This is not a valid BillBuffer file (expected an object).'] };
	}

	// `testToday` is a prototype/test-harness-only override; its mere PRESENCE (valid
	// value or not) rejects the payload — never stripped-and-loaded (§12, F14).
	if ('testToday' in raw) {
		errors.push('This file contains a "testToday" field, which is never allowed in imported data.');
	}

	if (!Array.isArray(raw.bills)) {
		errors.push('This is not a valid BillBuffer file (missing a "bills" list).');
		return { ok: false, errors }; // fundamentally unusable; stop here (F2)
	}

	const paycheck = validatePaycheck(raw.paycheck, todayCivil, endCivil, errors);
	const bills = raw.bills.map((bill, index) => validateBill(bill, index, errors));

	if (errors.length > 0) return { ok: false, errors };

	return {
		ok: true,
		value: {
			onboarded: raw.onboarded === true,
			paycheck,
			bills
		}
	};
}

/** Returns null when no paycheck is present (a valid mid-onboarding state). */
function validatePaycheck(
	raw: unknown,
	today: CivilDate,
	end: CivilDate,
	errors: string[]
): Paycheck | null {
	if (raw === undefined || raw === null) return null;
	if (!isRecord(raw)) {
		errors.push('Paycheck must be an object.');
		return null;
	}

	if (!isFiniteNumber(raw.amount) || raw.amount <= 0) {
		errors.push('Paycheck amount must be a number greater than 0.');
	}
	if (!isPaycheckFreq(raw.freq)) {
		errors.push('Paycheck frequency must be weekly, biweekly, or monthly.');
	}
	if (!isValidIsoDate(raw.next)) {
		errors.push('Paycheck next payday must be a valid date (YYYY-MM-DD).');
	}

	// billsAccountBalanceToday: blank → 0; otherwise must be finite. MAY be negative
	// (overdrawn) — a negative value is NOT rejected (C7/F9).
	let billsAccountBalanceToday = 0;
	if (!isBlank(raw.billsAccountBalanceToday)) {
		if (isFiniteNumber(raw.billsAccountBalanceToday)) {
			billsAccountBalanceToday = raw.billsAccountBalanceToday;
		} else {
			errors.push('Bills-account balance must be a finite number.');
		}
	}

	// cushion: blank → 0; otherwise finite and ≥ 0 (C1/F6).
	let cushion = 0;
	if (!isBlank(raw.cushion)) {
		if (isFiniteNumber(raw.cushion) && raw.cushion >= 0) {
			cushion = raw.cushion;
		} else {
			errors.push('Cushion must be a finite number of at least 0.');
		}
	}

	// Payday-in-horizon: only meaningful once freq + next are valid. Reject a strictly
	// valid `next` that yields ZERO paydays in [today, horizonEnd] BEFORE any forecast
	// (guards the avg = outflow / paychecks division) (§3, C8, F13).
	if (isPaycheckFreq(raw.freq) && isValidIsoDate(raw.next)) {
		if (generatePaydays(raw.next, raw.freq, today, end).length < 1) {
			errors.push(NEXT_TOO_FAR);
		}
	}

	return {
		amount: isFiniteNumber(raw.amount) ? raw.amount : 0,
		freq: isPaycheckFreq(raw.freq) ? raw.freq : 'monthly',
		next: typeof raw.next === 'string' ? raw.next : '',
		billsAccountBalanceToday,
		cushion
	};
}

function validateBill(raw: unknown, index: number, errors: string[]): Bill {
	if (!isRecord(raw)) {
		errors.push(`Bill ${index + 1} must be an object.`);
		return {
			id: `bill-${index + 1}`,
			name: '',
			amount: 0,
			dueDate: '',
			freq: 'monthly',
			showPayoff: false,
			balance: 0,
			apr: 0,
			stopWhenPaid: false
		};
	}

	const nameOk = typeof raw.name === 'string' && raw.name.trim() !== '';
	const name = nameOk ? (raw.name as string).trim() : '';
	if (!nameOk) errors.push(`Bill ${index + 1} needs a name.`);
	const who = nameOk ? `"${name}"` : `Bill ${index + 1}`;

	if (!isFiniteNumber(raw.amount) || raw.amount <= 0) {
		errors.push(`${who} amount must be a number greater than 0.`);
	}
	if (!isValidIsoDate(raw.dueDate)) {
		errors.push(`${who} due date must be a valid date (YYYY-MM-DD).`);
	}

	// Revolving debt (§8): showPayoff forces monthly; stopWhenPaid only applies when
	// showPayoff is true.
	const showPayoff = raw.showPayoff === true;
	const stopWhenPaid = showPayoff && raw.stopWhenPaid === true;

	// Validate the incoming frequency FIRST — a missing/garbage value is rejected even
	// for a card. Only a VALID frequency is then coerced to monthly for revolving debt
	// (§8/E5); coercion must never launder a corrupt value into a pass.
	let freq: BillFreq = 'monthly';
	if (isBillFreq(raw.freq)) {
		freq = showPayoff ? 'monthly' : raw.freq;
	} else {
		errors.push(`${who} frequency must be monthly, quarterly, or annual.`);
	}

	// balance: optional → 0, EXCEPT a revolving + stop-when-paid bill requires it
	// present (0 accepted = already paid off) (§12, F7/F12/E6). A provided value must
	// be finite and ≥ 0 (C6).
	let balance = 0;
	if (showPayoff && stopWhenPaid && isBlank(raw.balance)) {
		errors.push(`${who}: ${NEEDS_BALANCE}.`);
	} else if (!isBlank(raw.balance)) {
		if (isFiniteNumber(raw.balance) && raw.balance >= 0) {
			balance = raw.balance;
		} else {
			errors.push(`${who} balance must be a finite number of at least 0.`);
		}
	}

	// apr: optional → 0; a provided value must be finite and ≥ 0 (C6).
	let apr = 0;
	if (!isBlank(raw.apr)) {
		if (isFiniteNumber(raw.apr) && raw.apr >= 0) {
			apr = raw.apr;
		} else {
			errors.push(`${who} APR must be a finite number of at least 0.`);
		}
	}

	return {
		id: !isBlank(raw.id) ? String(raw.id).trim() : `bill-${index + 1}`,
		name,
		amount: isFiniteNumber(raw.amount) ? raw.amount : 0,
		dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : '',
		freq,
		showPayoff,
		balance,
		apr,
		stopWhenPaid
	};
}

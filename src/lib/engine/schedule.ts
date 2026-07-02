// Timeline generation: paydays and bill occurrences within the 36-month horizon.
// Anchored to the given dates, no drift; occurrences are always measured from the
// original anchor. Pure — inputs are never mutated.

import { addDays, compareDates, parseIsoDate, shiftMonths, type CivilDate } from './dates';
import type { BillFreq, Frequency } from './types';

export const HORIZON_MONTHS = 36;

// A generous per-series backstop; real horizons produce ≤ ~157 paydays / ≤ 36 bills.
const MAX_OCCURRENCES = 5000;

const PERIOD_MONTHS: Record<BillFreq, number> = { monthly: 1, quarterly: 3, annual: 12 };

/** End of the 36-month forecast horizon (month-clamped). */
export function horizonEnd(today: CivilDate): CivilDate {
	return shiftMonths(today, HORIZON_MONTHS);
}

/** Occurrences of an anchored series within [today, end], first one on/after today. */
function occurrencesInHorizon(
	base: CivilDate,
	nth: (k: number) => CivilDate,
	today: CivilDate,
	end: CivilDate
): CivilDate[] {
	const out: CivilDate[] = [];
	let k = 0;
	while (k < MAX_OCCURRENCES && compareDates(nth(k), today) < 0) k++;
	while (k < MAX_OCCURRENCES) {
		const d = nth(k);
		if (compareDates(d, end) > 0) break;
		out.push(d);
		k++;
	}
	return out;
}

/**
 * Paydays from the next payday through the horizon, anchored with no date drift:
 * weekly = +7·k days, biweekly = +14·k days, monthly = +k months (end-of-month clamp).
 */
export function generatePaydays(
	next: string,
	freq: Frequency,
	today: CivilDate,
	end: CivilDate
): CivilDate[] {
	const base = parseIsoDate(next);
	if (!base) return [];
	const nth = (k: number): CivilDate => {
		if (freq === 'weekly') return addDays(base, 7 * k);
		if (freq === 'biweekly') return addDays(base, 14 * k);
		return shiftMonths(base, k);
	};
	return occurrencesInHorizon(base, nth, today, end);
}

/**
 * Occurrences of a bill within the horizon, measured from its original due date
 * (monthly = 1mo, quarterly = 3mo, annual = 12mo apart, end-of-month clamped).
 */
export function generateBillOccurrences(
	dueDate: string,
	freq: BillFreq,
	today: CivilDate,
	end: CivilDate
): CivilDate[] {
	const base = parseIsoDate(dueDate);
	if (!base) return [];
	const step = PERIOD_MONTHS[freq];
	const nth = (k: number): CivilDate => shiftMonths(base, step * k);
	return occurrencesInHorizon(base, nth, today, end);
}

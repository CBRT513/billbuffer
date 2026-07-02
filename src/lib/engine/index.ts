// Public API of the BillBuffer calculation engine — a pure TypeScript library
// (no Svelte, no IndexedDB, no browser APIs, no DOM). Deterministic: given the same
// input and "today", it always returns the same result.

export { forecast, horizonEnd, EngineError } from './forecast';
export type { Paycheck, Bill, Frequency, BillFreq, ForecastInput, ForecastResult } from './types';

// Lower-level building blocks (exported for tests and future layers).
export {
	parseIsoDate,
	formatIsoDate,
	shiftMonths,
	addDays,
	compareDates,
	daysInMonth,
	isLeapYear,
	toOrdinal,
	fromOrdinal,
	type CivilDate
} from './dates';
export { generatePaydays, generateBillOccurrences } from './schedule';
export { payoffMonths } from './payoff';
export { toCents, ceilDiv, dollarsUp, dollarsDown } from './money';

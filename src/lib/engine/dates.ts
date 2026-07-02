// Pure calendar math. No `Date`, no timezones, no clock reads — the engine takes
// "today" as an explicit input, so the whole library is deterministic and runs
// unchanged in Node, Vitest, or a browser. Dates are civil {y, m, d} and all day
// arithmetic goes through integer ordinals (Howard Hinnant's algorithm).

export interface CivilDate {
	readonly y: number;
	readonly m: number; // 1–12
	readonly d: number; // 1–31
}

export function isLeapYear(y: number): boolean {
	return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function daysInMonth(y: number, m: number): number {
	return m === 2 && isLeapYear(y) ? 29 : MONTH_DAYS[m - 1];
}

/**
 * Strict "YYYY-MM-DD" parse. Returns null for anything that isn't a real calendar
 * date (e.g. 2026-02-31, 2026-02-29 in a non-leap year) — round-trip safe, never
 * rolls over.
 */
export function parseIsoDate(s: string): CivilDate | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!match) return null;
	const y = Number(match[1]);
	const m = Number(match[2]);
	const d = Number(match[3]);
	if (m < 1 || m > 12) return null;
	if (d < 1 || d > daysInMonth(y, m)) return null;
	return { y, m, d };
}

export function formatIsoDate(date: CivilDate): string {
	const mm = String(date.m).padStart(2, '0');
	const dd = String(date.d).padStart(2, '0');
	return `${date.y}-${mm}-${dd}`;
}

/** Days since 1970-01-01 (pure integer math; negative before the epoch). */
export function toOrdinal(date: CivilDate): number {
	let y = date.y;
	const m = date.m;
	const d = date.d;
	y -= m <= 2 ? 1 : 0;
	const era = Math.floor((y >= 0 ? y : y - 399) / 400);
	const yoe = y - era * 400; // [0, 399]
	const doy = Math.floor((153 * (m > 2 ? m - 3 : m + 9) + 2) / 5) + d - 1; // [0, 365]
	const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy; // [0, 146096]
	return era * 146097 + doe - 719468;
}

/** Inverse of toOrdinal. */
export function fromOrdinal(z: number): CivilDate {
	const zz = z + 719468;
	const era = Math.floor((zz >= 0 ? zz : zz - 146096) / 146097);
	const doe = zz - era * 146097; // [0, 146096]
	const yoe = Math.floor(
		(doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365
	); // [0, 399]
	const y = yoe + era * 400;
	const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)); // [0, 365]
	const mp = Math.floor((5 * doy + 2) / 153); // [0, 11]
	const d = doy - Math.floor((153 * mp + 2) / 5) + 1; // [1, 31]
	const m = mp < 10 ? mp + 3 : mp - 9; // [1, 12]
	return { y: y + (m <= 2 ? 1 : 0), m, d };
}

export function addDays(date: CivilDate, n: number): CivilDate {
	return fromOrdinal(toOrdinal(date) + n);
}

/** Shift by whole months, clamping the day to the target month's length (Jan 31 +1mo → Feb 28/29). */
export function shiftMonths(date: CivilDate, n: number): CivilDate {
	const total = date.m - 1 + n;
	const y = date.y + Math.floor(total / 12);
	const m = (((total % 12) + 12) % 12) + 1;
	const d = Math.min(date.d, daysInMonth(y, m));
	return { y, m, d };
}

/** Negative / zero / positive if a is before / same as / after b. */
export function compareDates(a: CivilDate, b: CivilDate): number {
	return toOrdinal(a) - toOrdinal(b);
}

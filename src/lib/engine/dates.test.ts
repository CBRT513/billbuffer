import { describe, it, expect } from 'vitest';
import {
	addDays,
	compareDates,
	daysInMonth,
	formatIsoDate,
	fromOrdinal,
	isLeapYear,
	parseIsoDate,
	shiftMonths,
	toOrdinal
} from './dates';

describe('strict date validation (TEST_MATRIX B2/B3)', () => {
	it('accepts real dates', () => {
		expect(parseIsoDate('2026-01-31')).toEqual({ y: 2026, m: 1, d: 31 });
		expect(parseIsoDate('2028-02-29')).toEqual({ y: 2028, m: 2, d: 29 }); // leap
	});

	it('rejects impossible / malformed dates (never rolls over)', () => {
		expect(parseIsoDate('2026-02-31')).toBeNull();
		expect(parseIsoDate('2026-02-29')).toBeNull(); // non-leap
		expect(parseIsoDate('2026-13-01')).toBeNull();
		expect(parseIsoDate('2026-00-10')).toBeNull();
		expect(parseIsoDate('2026-1-1')).toBeNull();
		expect(parseIsoDate('not-a-date')).toBeNull();
	});

	it('knows leap years and month lengths', () => {
		expect(isLeapYear(2028)).toBe(true);
		expect(isLeapYear(2026)).toBe(false);
		expect(isLeapYear(2000)).toBe(true);
		expect(isLeapYear(1900)).toBe(false);
		expect(daysInMonth(2026, 2)).toBe(28);
		expect(daysInMonth(2028, 2)).toBe(29);
	});
});

describe('month-clamped recurrence (TEST_MATRIX B1)', () => {
	it('Jan 31 monthly clamps but is measured from the original 31st', () => {
		const jan31 = parseIsoDate('2026-01-31')!;
		expect(formatIsoDate(shiftMonths(jan31, 1))).toBe('2026-02-28'); // non-leap Feb
		expect(formatIsoDate(shiftMonths(jan31, 2))).toBe('2026-03-31'); // back to 31
		expect(formatIsoDate(shiftMonths(jan31, 3))).toBe('2026-04-30');
	});

	it('leap Feb keeps the 29th', () => {
		const jan31 = parseIsoDate('2028-01-31')!;
		expect(formatIsoDate(shiftMonths(jan31, 1))).toBe('2028-02-29');
	});

	it('shifts across year boundaries', () => {
		expect(formatIsoDate(shiftMonths(parseIsoDate('2030-01-01')!, 36))).toBe('2033-01-01');
		expect(formatIsoDate(shiftMonths(parseIsoDate('2030-11-15')!, 3))).toBe('2031-02-15');
	});
});

describe('ordinal day math', () => {
	it('round-trips civil ⇄ ordinal across many dates', () => {
		let d = parseIsoDate('2020-01-01')!;
		for (let i = 0; i < 4000; i++) {
			expect(fromOrdinal(toOrdinal(d))).toEqual(d);
			d = addDays(d, 1);
		}
	});

	it('addDays and compareDates agree with the calendar', () => {
		expect(formatIsoDate(addDays(parseIsoDate('2030-01-08')!, 14))).toBe('2030-01-22');
		expect(formatIsoDate(addDays(parseIsoDate('2032-02-28')!, 1))).toBe('2032-02-29'); // leap
		expect(compareDates(parseIsoDate('2030-01-01')!, parseIsoDate('2030-01-02')!)).toBeLessThan(0);
		expect(compareDates(parseIsoDate('2030-01-02')!, parseIsoDate('2030-01-02')!)).toBe(0);
	});
});

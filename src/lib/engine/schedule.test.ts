import { describe, it, expect } from 'vitest';
import { parseIsoDate, formatIsoDate, shiftMonths, type CivilDate } from './dates';
import { generateBillOccurrences, generatePaydays, horizonEnd } from './schedule';

const today = parseIsoDate('2030-01-01')!;
const end: CivilDate = horizonEnd(today); // 2033-01-01
const iso = (d: CivilDate) => formatIsoDate(d);

describe('payday generation (TEST_MATRIX A7/A8/A9)', () => {
	it('weekly: +7-day steps, no drift; D5 anchor yields 156 in the horizon', () => {
		const days = generatePaydays('2030-01-08', 'weekly', today, end);
		expect(days.length).toBe(156);
		expect(iso(days[0])).toBe('2030-01-08');
		expect(iso(days[1])).toBe('2030-01-15');
		expect(iso(days[days.length - 1])).toBe('2032-12-28');
	});

	it('biweekly: +14-day steps; Fixture A anchor yields 79', () => {
		const days = generatePaydays('2030-01-04', 'biweekly', today, end);
		expect(days.length).toBe(79);
		expect(iso(days[0])).toBe('2030-01-04');
		expect(iso(days[1])).toBe('2030-01-18');
	});

	it('monthly: whole-month steps with end-of-month clamping', () => {
		const days = generatePaydays('2030-01-31', 'monthly', today, end);
		expect(iso(days[0])).toBe('2030-01-31');
		expect(iso(days[1])).toBe('2030-02-28'); // clamp
		expect(iso(days[2])).toBe('2030-03-31'); // back to 31
	});

	it('first payday is on/after today; a payday far past the horizon yields none', () => {
		expect(generatePaydays('2033-06-01', 'weekly', today, end).length).toBe(0);
	});
});

describe('bill occurrence generation (TEST_MATRIX A4/A5/A6)', () => {
	it('monthly recurs every month from the due date', () => {
		const occ = generateBillOccurrences('2030-01-15', 'monthly', today, end);
		expect(occ.length).toBe(36);
		expect(iso(occ[0])).toBe('2030-01-15');
		expect(iso(occ[1])).toBe('2030-02-15');
	});

	it('quarterly recurs every 3 months', () => {
		const occ = generateBillOccurrences('2030-02-05', 'quarterly', today, end);
		expect(iso(occ[0])).toBe('2030-02-05');
		expect(iso(occ[1])).toBe('2030-05-05');
	});

	it('annual recurs every 12 months (3 in a 36-month horizon)', () => {
		const occ = generateBillOccurrences('2030-01-20', 'annual', today, end);
		expect(occ.map(iso)).toEqual(['2030-01-20', '2031-01-20', '2032-01-20']);
	});
});

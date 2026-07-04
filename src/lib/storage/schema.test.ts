import { describe, it, expect } from 'vitest';
import { emptyAppData } from '$lib/types';
import type { AppData } from '$lib/types';
import { SCHEMA_VERSION, fromStored, normalizeAppData, toStored } from './schema';

function sampleAppData(): AppData {
	return {
		onboarded: true,
		paycheck: {
			amount: 1500,
			freq: 'biweekly',
			next: '2030-01-04',
			billsAccountBalanceToday: -100,
			cushion: 0
		},
		bills: [
			{
				id: 'card-a',
				name: 'Card A',
				amount: 45,
				dueDate: '2030-01-02',
				freq: 'monthly',
				showPayoff: true,
				balance: 400,
				apr: 24,
				stopWhenPaid: false
			}
		]
	};
}

describe('storage schema — versioning envelope', () => {
	it('toStored wraps AppData with the current schema version', () => {
		const stored = toStored(sampleAppData());
		expect(stored.schemaVersion).toBe(SCHEMA_VERSION);
		expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
		expect(SCHEMA_VERSION).toBeGreaterThan(0);
	});

	it('fromStored unwraps a current-version envelope back to the AppData', () => {
		const original = sampleAppData();
		expect(fromStored(toStored(original))).toEqual(original);
	});

	it('fromStored reads a bare legacy record (no envelope) defensively', () => {
		// The scaffold persisted AppData directly, without the { schemaVersion, data }
		// wrapper — reads must still cope.
		const legacy = sampleAppData();
		expect(fromStored(legacy)).toEqual(legacy);
	});
});

describe('storage schema — tolerant reads (brief §5)', () => {
	it('empty / first-run store → empty AppData', () => {
		expect(fromStored(undefined)).toEqual(emptyAppData());
		expect(fromStored(null)).toEqual(emptyAppData());
		expect(fromStored({})).toEqual(emptyAppData());
	});

	it('non-object junk → empty AppData', () => {
		expect(fromStored(42)).toEqual(emptyAppData());
		expect(fromStored('nope')).toEqual(emptyAppData());
		expect(fromStored([1, 2, 3])).toEqual(emptyAppData());
	});

	it('onboarded but no paycheck is tolerated', () => {
		const data = fromStored({ schemaVersion: 1, data: { onboarded: true } });
		expect(data.onboarded).toBe(true);
		expect(data.paycheck).toBeNull();
		expect(data.bills).toEqual([]);
	});

	it('paycheck but no bills is tolerated', () => {
		const data = normalizeAppData({ onboarded: true, paycheck: { amount: 1500 } });
		expect(data.paycheck).not.toBeNull();
		expect(data.bills).toEqual([]);
	});

	it('a non-array bills field degrades to an empty list', () => {
		expect(normalizeAppData({ bills: 'oops' }).bills).toEqual([]);
		expect(normalizeAppData({ bills: { 0: 'x' } }).bills).toEqual([]);
	});

	it('drops non-object entries inside the bills array', () => {
		const data = normalizeAppData({ bills: [null, 5, 'x', { id: 'keep' }] });
		expect(data.bills).toHaveLength(1);
		expect(data.bills[0].id).toBe('keep');
	});

	it('onboarded coerces to a strict boolean', () => {
		expect(normalizeAppData({ onboarded: 'yes' }).onboarded).toBe(false);
		expect(normalizeAppData({ onboarded: 1 }).onboarded).toBe(false);
		expect(normalizeAppData({ onboarded: true }).onboarded).toBe(true);
	});
});

describe('storage schema — normalization does not alias the caller', () => {
	it('normalizeAppData returns an independent object graph', () => {
		const input = sampleAppData();
		const out = normalizeAppData(input);
		expect(out).toEqual(input);
		expect(out).not.toBe(input);
		expect(out.bills).not.toBe(input.bills);
		expect(out.bills[0]).not.toBe(input.bills[0]);
		expect(out.paycheck).not.toBe(input.paycheck);
	});

	it('mutating the input after normalization does not touch the output', () => {
		const input = sampleAppData();
		const out = normalizeAppData(input);
		input.bills[0].amount = 9999;
		input.bills.push({ id: 'later' } as never);
		input.paycheck!.cushion = 500;
		expect(out.bills).toHaveLength(1);
		expect(out.bills[0].amount).toBe(45);
		expect(out.paycheck?.cushion).toBe(0);
	});

	it('toStored does not mutate its argument', () => {
		const input = sampleAppData();
		const snapshot = structuredClone(input);
		toStored(input);
		expect(input).toEqual(snapshot);
	});
});

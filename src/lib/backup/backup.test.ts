import { describe, it, expect } from 'vitest';
import type { AppData } from '$lib/types';
import { BACKUP_FILENAME, parseBackup, serializeAppData } from './backup';

const opts = { today: '2030-01-01' };

// A fully-normalized, valid AppData: the validator returns it unchanged, so it
// round-trips to an equal value.
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
			},
			{
				id: 'rent',
				name: 'Apartment',
				amount: 900,
				dueDate: '2030-01-25',
				freq: 'monthly',
				showPayoff: false,
				balance: 0,
				apr: 0,
				stopWhenPaid: false
			}
		]
	};
}

describe('export — serializeAppData', () => {
	it('round-trips: serialize → parse → validate yields the equivalent normalized AppData', () => {
		const data = sampleAppData();
		const result = parseBackup(serializeAppData(data), opts);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(data);
	});

	it('exported JSON contains no test-only fields (no testToday, no schemaVersion)', () => {
		const text = serializeAppData(sampleAppData());
		expect(text).not.toContain('testToday');
		expect(text).not.toContain('schemaVersion');
		const parsed = JSON.parse(text);
		expect(Object.keys(parsed).sort()).toEqual(['bills', 'onboarded', 'paycheck']);
	});

	it('is deterministic — the same AppData serializes to byte-identical text', () => {
		expect(serializeAppData(sampleAppData())).toBe(serializeAppData(sampleAppData()));
	});

	it('drops any stray in-memory field, exporting only the canonical AppData shape', () => {
		const dirty = { ...sampleAppData(), testToday: '2030-01-01', junk: 42 } as unknown as AppData;
		const parsed = JSON.parse(serializeAppData(dirty));
		expect(parsed.testToday).toBeUndefined();
		expect(parsed.junk).toBeUndefined();
	});

	it('serializes an empty first-run record', () => {
		const empty: AppData = { onboarded: false, paycheck: null, bills: [] };
		const result = parseBackup(serializeAppData(empty), opts);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value).toEqual(empty);
	});

	it('exposes the stable backup filename', () => {
		expect(BACKUP_FILENAME).toBe('billbuffer-backup.json');
	});
});

describe('import — parseBackup (validator-backed)', () => {
	function text(obj: unknown): string {
		return JSON.stringify(obj);
	}
	function base() {
		return JSON.parse(serializeAppData(sampleAppData()));
	}

	it('rejects malformed JSON without throwing', () => {
		const result = parseBackup('{ not: valid json', opts);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.errors.join(' ')).toContain('not valid JSON');
	});

	it('rejects a payload containing testToday', () => {
		const result = parseBackup(text({ ...base(), testToday: '2030-01-01' }), opts);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.errors.join(' ')).toContain('testToday');
	});

	it('rejects malformed / impossible dates', () => {
		const bad = base();
		bad.bills[1].dueDate = '2026-02-31';
		expect(parseBackup(text(bad), opts).ok).toBe(false);
	});

	it('rejects invalid frequencies and amounts', () => {
		const badFreq = base();
		badFreq.paycheck.freq = 'daily';
		expect(parseBackup(text(badFreq), opts).ok).toBe(false);

		const badAmount = base();
		badAmount.bills[0].amount = 0;
		expect(parseBackup(text(badAmount), opts).ok).toBe(false);
	});

	it('accepts valid blank optional debt fields (normalized to 0)', () => {
		const result = parseBackup(
			text({
				onboarded: false,
				paycheck: null,
				bills: [
					{
						id: 'g',
						name: 'Gym',
						amount: 20,
						dueDate: '2030-03-01',
						freq: 'monthly',
						showPayoff: false,
						balance: '',
						apr: null
					}
				]
			}),
			opts
		);
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value.bills[0].balance).toBe(0);
			expect(result.value.bills[0].apr).toBe(0);
		}
	});

	it('accepts balance 0 for a stop-when-paid revolving bill', () => {
		const result = parseBackup(
			text({
				onboarded: false,
				paycheck: null,
				bills: [
					{
						id: 'c',
						name: 'Card',
						amount: 25,
						dueDate: '2030-01-10',
						freq: 'monthly',
						showPayoff: true,
						stopWhenPaid: true,
						balance: 0,
						apr: 20
					}
				]
			}),
			opts
		);
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.value.bills[0].balance).toBe(0);
	});
});

// Exercises the real IndexedDB code path against a fake IndexedDB. `.../auto`
// installs a spec-compliant `indexedDB` on globalThis (with structured-clone
// semantics), which is exactly what db.ts gates on.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import type { AppData } from '$lib/types';
import { emptyAppData } from '$lib/types';
import { SCHEMA_VERSION } from './schema';
import { clearAppData, loadAppData, peekStoredVersion, saveAppData } from './db';

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

function deleteDb(): Promise<void> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.deleteDatabase('billbuffer');
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
		// db.ts closes its connection on tx.oncomplete, so a delete is never blocked.
		req.onblocked = () => resolve();
	});
}

describe('IndexedDB persistence', () => {
	beforeEach(async () => {
		await deleteDb();
	});

	it('first-run load returns a fresh empty record', async () => {
		expect(await loadAppData()).toEqual(emptyAppData());
	});

	it('save → load round-trips losslessly', async () => {
		const data = sampleAppData();
		await saveAppData(data);
		expect(await loadAppData()).toEqual(data);
	});

	it('save persists the current schema version', async () => {
		await saveAppData(sampleAppData());
		expect(await peekStoredVersion()).toBe(SCHEMA_VERSION);
	});

	it('peekStoredVersion is null before anything is saved', async () => {
		expect(await peekStoredVersion()).toBeNull();
	});

	it('clear wipes the store back to the empty record', async () => {
		await saveAppData(sampleAppData());
		expect((await loadAppData()).onboarded).toBe(true);

		await clearAppData();

		expect(await loadAppData()).toEqual(emptyAppData());
		expect(await peekStoredVersion()).toBeNull();
	});

	it('a later save overwrites the previous record', async () => {
		await saveAppData(sampleAppData());
		await saveAppData(emptyAppData());
		expect(await loadAppData()).toEqual(emptyAppData());
	});

	it('stored data does not mutate when the caller later mutates its input', async () => {
		const data = sampleAppData();
		await saveAppData(data);

		// Mutate the caller's object AFTER saving — the persisted copy must be frozen
		// at its save-time value.
		data.onboarded = false;
		data.bills[0].amount = 9999;
		data.bills.push({ id: 'sneaked-in' } as never);
		data.paycheck!.cushion = 500;

		const loaded = await loadAppData();
		expect(loaded.onboarded).toBe(true);
		expect(loaded.bills).toHaveLength(1);
		expect(loaded.bills[0].amount).toBe(45);
		expect(loaded.paycheck?.cushion).toBe(0);
	});

	it('each load returns an independent graph (mutating one load never leaks)', async () => {
		await saveAppData(sampleAppData());
		const first = await loadAppData();
		first.bills[0].amount = 1;
		const second = await loadAppData();
		expect(second.bills[0].amount).toBe(45);
	});
});

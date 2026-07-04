import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import type { AppData } from '$lib/types';
import { serializeAppData } from '$lib/backup/backup';
import { loadAppData, saveAppData } from './db';
import { importBackupText } from './importExport';

const opts = { today: '2030-01-01' };

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
		req.onblocked = () => resolve();
	});
}

describe('import/export — persistence orchestration', () => {
	beforeEach(async () => {
		await deleteDb();
	});

	it('export → import replaces stored state with the equivalent normalized AppData', () => {
		const data = sampleAppData();
		return importBackupText(serializeAppData(data), opts).then(async (result) => {
			expect(result.ok).toBe(true);
			if (result.ok) expect(result.value).toEqual(data);
			expect(await loadAppData()).toEqual(data);
		});
	});

	it('a rejected import (testToday) leaves current data untouched', async () => {
		const seeded = sampleAppData();
		await saveAppData(seeded);

		const badText = JSON.stringify({
			...JSON.parse(serializeAppData(seeded)),
			testToday: '2030-01-01'
		});
		const result = await importBackupText(badText, opts);

		expect(result.ok).toBe(false);
		expect(await loadAppData()).toEqual(seeded); // unchanged
	});

	it('a rejected import (malformed JSON) leaves current data untouched', async () => {
		const seeded = sampleAppData();
		await saveAppData(seeded);

		const result = await importBackupText('{ broken', opts);

		expect(result.ok).toBe(false);
		expect(await loadAppData()).toEqual(seeded);
	});

	it('a rejected import (impossible date) writes nothing on a first-run store', async () => {
		const bad = JSON.parse(serializeAppData(sampleAppData()));
		bad.bills[0].dueDate = '2026-02-31';

		const result = await importBackupText(JSON.stringify(bad), opts);

		expect(result.ok).toBe(false);
		expect(await loadAppData()).toEqual({ onboarded: false, paycheck: null, bills: [] });
	});
});

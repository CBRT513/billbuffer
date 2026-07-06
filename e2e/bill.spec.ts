import { test, expect, type Page } from '@playwright/test';

// Add / edit / delete Bill screen: a form validated through the shared validator and
// persisted to IndexedDB, preserving the paycheck and all other bills. Driven through
// the real browser; cross-screen assertions use the privacy summary's counts.

function isoDaysFromNow(days: number): string {
	const d = new Date(Date.now() + days * 86_400_000);
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

// Write the storage envelope directly (DB "billbuffer" v1, store "appdata", key
// "current", value { schemaVersion, data }) so a test can start from stored data.
async function seed(page: Page, data: unknown) {
	await page.evaluate(
		(appData) =>
			new Promise<void>((resolve, reject) => {
				const open = indexedDB.open('billbuffer', 1);
				open.onupgradeneeded = () => {
					if (!open.result.objectStoreNames.contains('appdata')) {
						open.result.createObjectStore('appdata');
					}
				};
				open.onsuccess = () => {
					const db = open.result;
					const tx = db.transaction('appdata', 'readwrite');
					tx.objectStore('appdata').put({ schemaVersion: 1, data: appData }, 'current');
					tx.oncomplete = () => {
						db.close();
						resolve();
					};
					tx.onerror = () => reject(tx.error);
				};
				open.onerror = () => reject(open.error);
			}),
		data
	);
}

function billRent(over: Record<string, unknown> = {}) {
	return {
		id: 'rent',
		name: 'Rent',
		amount: 900,
		dueDate: '2030-01-25',
		freq: 'monthly',
		showPayoff: false,
		balance: 0,
		apr: 0,
		stopWhenPaid: false,
		...over
	};
}

async function fillBasic(
	page: Page,
	o: {
		name?: string;
		amount?: string;
		due?: string;
		freq?: 'monthly' | 'quarterly' | 'annual' | null;
	} = {}
) {
	await page.getByTestId('name').fill(o.name ?? 'Rent');
	await page.getByTestId('amount').fill(o.amount ?? '900');
	await page.getByTestId('due').fill(o.due ?? '2030-01-25');
	if (o.freq !== null) await page.getByTestId('freq').selectOption(o.freq ?? 'monthly');
}

const add = (page: Page) => page.getByRole('button', { name: 'Add bill' }).click();
const saveEdit = (page: Page) => page.getByRole('button', { name: 'Save bill' }).click();
const heldBills = (page: Page) => page.getByTestId('held-bills');

test.describe('Add / edit / delete bill', () => {
	test('creates a bill', async ({ page }) => {
		await page.goto('/bill/new');
		await fillBasic(page);
		await add(page);
		await expect(page.getByTestId('status')).toContainText('added');

		await page.goto('/privacy');
		await expect(heldBills(page)).toHaveText('Bills: 1');
	});

	test('edits an existing bill and persists the change', async ({ page }) => {
		await page.goto('/');
		await seed(page, { onboarded: false, paycheck: null, bills: [billRent()] });
		await page.goto('/bill/rent');

		await expect(page.getByTestId('name')).toHaveValue('Rent');
		await expect(page.getByTestId('amount')).toHaveValue('900');

		await page.getByTestId('amount').fill('950');
		await saveEdit(page);
		await expect(page.getByTestId('status')).toContainText('saved');

		await page.reload();
		await expect(page.getByTestId('amount')).toHaveValue('950');
		await page.goto('/privacy');
		await expect(heldBills(page)).toHaveText('Bills: 1');
	});

	test('deletes a bill after explicit confirmation', async ({ page }) => {
		await page.goto('/');
		await seed(page, { onboarded: false, paycheck: null, bills: [billRent()] });
		await page.goto('/bill/rent');

		await page.getByTestId('delete').click();
		await expect(page.getByTestId('delete-confirm')).toBeVisible();
		await page.getByRole('button', { name: 'Yes, delete this bill' }).click();
		await expect(page.getByTestId('status')).toContainText('deleted');

		await page.goto('/privacy');
		await expect(heldBills(page)).toHaveText('Bills: 0');
	});

	test('preserves the paycheck when a bill changes', async ({ page }) => {
		await page.goto('/');
		await seed(page, {
			onboarded: true,
			paycheck: {
				amount: 1500,
				freq: 'biweekly',
				next: isoDaysFromNow(7),
				billsAccountBalanceToday: 0,
				cushion: 0
			},
			bills: [billRent()]
		});
		await page.goto('/bill/rent');
		await page.getByTestId('amount').fill('950');
		await saveEdit(page);
		await expect(page.getByTestId('status')).toContainText('saved');

		await page.goto('/privacy');
		await expect(page.getByTestId('held-paycheck')).toHaveText('Paycheck: saved');
		await expect(heldBills(page)).toHaveText('Bills: 1');
	});

	test('preserves other bills when one is edited', async ({ page }) => {
		await page.goto('/');
		await seed(page, {
			onboarded: false,
			paycheck: null,
			bills: [billRent(), billRent({ id: 'car', name: 'Car' })]
		});
		await page.goto('/bill/rent');
		await page.getByTestId('amount').fill('950');
		await saveEdit(page);
		await expect(page.getByTestId('status')).toContainText('saved');

		await page.goto('/privacy');
		await expect(heldBills(page)).toHaveText('Bills: 2');
	});

	test('rejects a non-positive amount', async ({ page }) => {
		await page.goto('/bill/new');
		await fillBasic(page, { amount: '-5' });
		await add(page);
		await expect(page.getByTestId('errors')).toContainText('amount');
		await expect(page.getByTestId('status')).toHaveCount(0);
	});

	test('rejects an empty/invalid due date', async ({ page }) => {
		await page.goto('/bill/new');
		await fillBasic(page, { due: '' });
		await add(page);
		await expect(page.getByTestId('errors')).toContainText('date');
	});

	test('rejects a missing frequency', async ({ page }) => {
		await page.goto('/bill/new');
		await fillBasic(page, { freq: null }); // left on the "Choose…" placeholder
		await add(page);
		await expect(page.getByTestId('errors')).toContainText('frequency');
	});

	test('revolving debt: a negative balance is rejected', async ({ page }) => {
		await page.goto('/bill/new');
		await page.getByTestId('name').fill('Card');
		await page.getByTestId('amount').fill('45');
		await page.getByTestId('due').fill('2030-01-10');
		await page.getByTestId('showPayoff').check();
		await page.getByTestId('balance').fill('-1');
		await page.getByTestId('apr').fill('24');
		await add(page);
		await expect(page.getByTestId('errors')).toContainText('balance');
	});

	test('revolving debt: stop-when-paid with a blank balance is rejected', async ({ page }) => {
		await page.goto('/bill/new');
		await page.getByTestId('name').fill('Card');
		await page.getByTestId('amount').fill('45');
		await page.getByTestId('due').fill('2030-01-10');
		await page.getByTestId('showPayoff').check();
		await page.getByTestId('stopWhenPaid').check();
		// balance left blank
		await add(page);
		await expect(page.getByTestId('errors')).toContainText('use 0 if already paid off');
	});

	test('revolving debt: stop-when-paid with balance 0 is accepted', async ({ page }) => {
		await page.goto('/bill/new');
		await page.getByTestId('name').fill('Card');
		await page.getByTestId('amount').fill('45');
		await page.getByTestId('due').fill('2030-01-10');
		await page.getByTestId('showPayoff').check();
		await page.getByTestId('stopWhenPaid').check();
		await page.getByTestId('balance').fill('0');
		await add(page);
		await expect(page.getByTestId('status')).toContainText('added');
	});

	test('revolving debt: a blank balance is accepted when stop-when-paid is off', async ({
		page
	}) => {
		await page.goto('/bill/new');
		await page.getByTestId('name').fill('Card');
		await page.getByTestId('amount').fill('45');
		await page.getByTestId('due').fill('2030-01-10');
		await page.getByTestId('showPayoff').check();
		// stop-when-paid off, balance blank → normalized to 0, accepted
		await add(page);
		await expect(page.getByTestId('status')).toContainText('added');
	});

	test('no external network / backend / analytics request occurs while saving', async ({
		page
	}) => {
		const offOrigin: string[] = [];
		page.on('request', (req) => {
			const url = req.url();
			const local =
				url.startsWith('http://localhost:4173') ||
				url.startsWith('blob:') ||
				url.startsWith('data:');
			if (!local) offOrigin.push(`${req.method()} ${url}`);
		});

		await page.goto('/bill/new');
		await fillBasic(page);
		await add(page);
		await expect(page.getByTestId('status')).toContainText('added');

		expect(offOrigin, 'the app made off-origin requests').toEqual([]);
	});
});

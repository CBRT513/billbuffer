import { test, expect, type Page } from '@playwright/test';

// Paycheck setup screen: a form validated through the shared validator and persisted to
// IndexedDB, preserving the existing bills array. Driven through the real browser.

// A payday inside the 36-month horizon (relative to the real "today" the app reads).
function isoDaysFromNow(days: number): string {
	const d = new Date(Date.now() + days * 86_400_000);
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	const dd = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${mm}-${dd}`;
}

// Write the storage envelope directly so a test can start from preexisting stored data.
// Matches src/lib/storage/{db,schema}.ts: DB "billbuffer" v1, store "appdata", key
// "current", value { schemaVersion, data }.
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

async function fillValidPaycheck(page: Page, over: Partial<Record<string, string>> = {}) {
	await page.getByTestId('amount').fill(over.amount ?? '1500');
	await page.getByTestId('freq').selectOption(over.freq ?? 'biweekly');
	await page.getByTestId('next').fill(over.next ?? isoDaysFromNow(7));
	await page.getByTestId('balance').fill(over.balance ?? '250');
	await page.getByTestId('cushion').fill(over.cushion ?? '100');
}

const save = (page: Page) => page.getByRole('button', { name: 'Save paycheck' }).click();

test.describe('Paycheck setup screen', () => {
	test('renders the form fields and save action', async ({ page }) => {
		await page.goto('/paycheck');
		await expect(page.getByRole('heading', { name: 'Your paycheck' })).toBeVisible();
		for (const id of ['amount', 'freq', 'next', 'balance', 'cushion']) {
			await expect(page.getByTestId(id)).toBeVisible();
		}
		await expect(page.getByRole('button', { name: 'Save paycheck' })).toBeVisible();
	});

	test('a valid paycheck saves and survives a reload', async ({ page }) => {
		const next = isoDaysFromNow(7);
		await page.goto('/paycheck');
		await fillValidPaycheck(page, { next });
		await save(page);
		await expect(page.getByTestId('status')).toContainText('saved');

		await page.reload();
		await expect(page.getByTestId('amount')).toHaveValue('1500');
		await expect(page.getByTestId('freq')).toHaveValue('biweekly');
		await expect(page.getByTestId('next')).toHaveValue(next);
		await expect(page.getByTestId('balance')).toHaveValue('250');
		await expect(page.getByTestId('cushion')).toHaveValue('100');
	});

	test('a non-positive amount is rejected and nothing is saved', async ({ page }) => {
		await page.goto('/paycheck');
		await fillValidPaycheck(page, { amount: '-5' });
		await save(page);
		await expect(page.getByTestId('errors')).toContainText('amount');
		await expect(page.getByTestId('status')).toHaveCount(0);
	});

	test('a missing/invalid payday is rejected', async ({ page }) => {
		await page.goto('/paycheck');
		await page.getByTestId('amount').fill('1500');
		await page.getByTestId('freq').selectOption('biweekly');
		// next left empty
		await save(page);
		await expect(page.getByTestId('errors')).toContainText('payday');
	});

	test('a payday beyond the 36-month horizon is rejected', async ({ page }) => {
		await page.goto('/paycheck');
		await fillValidPaycheck(page, { next: '2037-01-01' });
		await save(page);
		await expect(page.getByTestId('errors')).toContainText('too far in the future');
	});

	test('a negative cushion is rejected', async ({ page }) => {
		await page.goto('/paycheck');
		await fillValidPaycheck(page, { cushion: '-5' });
		await save(page);
		await expect(page.getByTestId('errors')).toContainText('Cushion');
		await expect(page.getByTestId('status')).toHaveCount(0);
	});

	test('a negative bills-account balance is accepted (overdrawn)', async ({ page }) => {
		await page.goto('/paycheck');
		await fillValidPaycheck(page, { balance: '-100' });
		await save(page);
		await expect(page.getByTestId('status')).toContainText('saved');

		await page.reload();
		await expect(page.getByTestId('balance')).toHaveValue('-100');
	});

	test('existing bills are preserved when the paycheck changes', async ({ page }) => {
		await page.goto('/paycheck');
		await seed(page, {
			onboarded: false,
			paycheck: null,
			bills: [
				{
					id: 'rent',
					name: 'Rent',
					amount: 900,
					dueDate: '2030-01-25',
					freq: 'monthly',
					showPayoff: false,
					balance: 0,
					apr: 0,
					stopWhenPaid: false
				}
			]
		});
		await page.reload();

		await fillValidPaycheck(page);
		await save(page);
		await expect(page.getByTestId('status')).toContainText('saved');

		// The bill is still there, and the paycheck is now stored.
		await page.goto('/privacy');
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 1');
		await expect(page.getByTestId('held-paycheck')).toHaveText('Paycheck: saved');
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

		await page.goto('/paycheck');
		await fillValidPaycheck(page);
		await save(page);
		await expect(page.getByTestId('status')).toContainText('saved');

		expect(offOrigin, 'the app made off-origin requests').toEqual([]);
	});
});

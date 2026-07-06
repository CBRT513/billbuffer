import { test, expect, type Page } from '@playwright/test';

// Bills list screen: read-only overview loaded from IndexedDB, each row linking into the
// editor. Driven through the real browser.

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

test.describe('Bills list screen', () => {
	test('shows an empty state prompting the first bill', async ({ page }) => {
		await page.goto('/bills');
		await expect(page.getByTestId('empty')).toBeVisible();
		await expect(page.getByTestId('empty')).toContainText("haven't added any bills");
		await expect(page.getByRole('link', { name: 'Add your first bill' })).toBeVisible();
	});

	test('renders stored bills with name, amount, frequency and due date', async ({ page }) => {
		await page.goto('/');
		await seed(page, {
			onboarded: false,
			paycheck: null,
			bills: [billRent(), billRent({ id: 'car', name: 'Car', amount: 250, dueDate: '2030-02-10' })]
		});
		await page.goto('/bills');

		await expect(page.getByTestId('bill-row')).toHaveCount(2);
		const rent = page.getByTestId('bill-row').filter({ hasText: 'Rent' });
		await expect(rent).toContainText('$900.00');
		await expect(rent).toContainText('Monthly');
		await expect(rent).toContainText('2030-01-25');
		await expect(page.getByTestId('bill-row').filter({ hasText: 'Car' })).toContainText('$250.00');
	});

	test('a bill row links to its edit page', async ({ page }) => {
		await page.goto('/');
		await seed(page, { onboarded: false, paycheck: null, bills: [billRent()] });
		await page.goto('/bills');

		await page.getByTestId('bill-row').click();

		await expect(page).toHaveURL(/\/bill\/rent$/);
		await expect(page.getByTestId('name')).toHaveValue('Rent');
	});

	test('the add-bill link opens the new-bill editor', async ({ page }) => {
		await page.goto('/bills');
		await page.getByTestId('add-bill').click();

		await expect(page).toHaveURL(/\/bill\/new$/);
		await expect(page.getByRole('heading', { name: 'Add a bill' })).toBeVisible();
	});

	test('a revolving-debt bill shows the credit-card marker', async ({ page }) => {
		await page.goto('/');
		await seed(page, {
			onboarded: false,
			paycheck: null,
			bills: [billRent({ id: 'card', name: 'Card', showPayoff: true, balance: 400, apr: 24 })]
		});
		await page.goto('/bills');

		await expect(page.getByTestId('revolving-badge')).toBeVisible();
		await expect(page.getByTestId('revolving-badge')).toHaveText('Credit card');
	});

	test('the list survives a reload', async ({ page }) => {
		await page.goto('/');
		await seed(page, { onboarded: false, paycheck: null, bills: [billRent()] });
		await page.goto('/bills');
		await expect(page.getByText('Rent')).toBeVisible();

		await page.reload();
		await expect(page.getByTestId('bill-row')).toHaveCount(1);
		await expect(page.getByText('Rent')).toBeVisible();
	});

	test('no external network / backend / analytics request occurs', async ({ page }) => {
		const offOrigin: string[] = [];
		page.on('request', (req) => {
			const url = req.url();
			const local =
				url.startsWith('http://localhost:4173') ||
				url.startsWith('blob:') ||
				url.startsWith('data:');
			if (!local) offOrigin.push(`${req.method()} ${url}`);
		});

		await page.goto('/');
		await seed(page, { onboarded: false, paycheck: null, bills: [billRent()] });
		await page.goto('/bills');
		await expect(page.getByText('Rent')).toBeVisible();

		expect(offOrigin, 'the app made off-origin requests').toEqual([]);
	});

	// Imported/legacy ids may legally contain reserved URL characters. The list must
	// encode them into the link and the [id] route must decode back to the exact id, so
	// clicking the row opens and edits the CORRECT bill (never a routing mismatch).
	for (const id of ['rent/2026', 'foo?bar', 'abc#123', 'a%b']) {
		test(`round-trips a bill id containing reserved characters: ${JSON.stringify(id)}`, async ({
			page
		}) => {
			await page.goto('/');
			await seed(page, {
				onboarded: false,
				paycheck: null,
				bills: [billRent({ id, name: 'Special' })]
			});
			await page.goto('/bills');

			await page.getByTestId('bill-row').click();

			// The editor opened the right record (decoded id matched the stored bill)…
			await expect(page.getByTestId('name')).toHaveValue('Special');

			// …and an edit updates THAT bill (id preserved exactly — no duplicate row).
			await page.getByTestId('amount').fill('123');
			await page.getByRole('button', { name: 'Save bill' }).click();
			await expect(page.getByTestId('status')).toContainText('saved');

			await page.goto('/bills');
			await expect(page.getByTestId('bill-row')).toHaveCount(1);
			await expect(page.getByTestId('bill-row')).toContainText('$123.00');
		});
	}
});

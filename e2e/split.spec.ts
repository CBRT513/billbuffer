import { test, expect, type Page } from '@playwright/test';

// Split / home screen: renders the pure engine's forecast from stored data. The
// forecast depends on "today", which the app reads from the clock — so these tests fix
// the browser clock (and pin the timezone to UTC so the fixed instant maps to the
// intended calendar day) to reproduce the spec's dated fixtures deterministically.
test.use({ timezoneId: 'UTC' });

// Write the storage envelope directly (DB "billbuffer" v1, store "appdata", key
// "current", value { schemaVersion, data }).
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

// Fix "today" to `iso`, seed `appData`, and (re)load the home screen so it forecasts.
async function loadHomeAt(page: Page, iso: string, appData: unknown) {
	await page.clock.setFixedTime(new Date(`${iso}T12:00:00Z`));
	await page.goto('/');
	await seed(page, appData);
	await page.goto('/');
}

function bill(over: Record<string, unknown>) {
	return {
		showPayoff: false,
		balance: 0,
		apr: 0,
		stopWhenPaid: false,
		...over
	};
}

// Fixture A — the engine's regression anchor (CALCULATION_ENGINE_SPEC.md §13).
const fixtureA = {
	onboarded: true,
	paycheck: {
		amount: 1500,
		freq: 'biweekly',
		next: '2030-01-04',
		billsAccountBalanceToday: 0,
		cushion: 0
	},
	bills: [
		bill({
			id: 'card-a',
			name: 'Card A',
			amount: 45,
			dueDate: '2030-01-02',
			freq: 'monthly',
			showPayoff: true,
			balance: 400,
			apr: 24
		}),
		bill({ id: 'elec', name: 'Electricity', amount: 90, dueDate: '2030-01-15', freq: 'monthly' }),
		bill({ id: 'phone', name: 'Phone Plan', amount: 70, dueDate: '2030-01-20', freq: 'monthly' }),
		bill({ id: 'apt', name: 'Apartment', amount: 900, dueDate: '2030-01-25', freq: 'monthly' }),
		bill({ id: 'auto', name: 'Auto Loan', amount: 250, dueDate: '2030-02-10', freq: 'monthly' }),
		bill({ id: 'water', name: 'Water', amount: 60, dueDate: '2030-02-05', freq: 'quarterly' }),
		bill({ id: 'reg', name: 'Registration', amount: 120, dueDate: '2030-03-01', freq: 'annual' })
	]
};

// A day-sensitive plan: the annual bill due 2030-01-01 lands before the first payday
// (so a catch-up is required) ONLY while "today" is 2030-01-01. On 2030-01-02 that
// occurrence has fallen out of the horizon window, so the catch-up disappears — a clean
// signal that the forecast recomputed for the new day.
const dayEdgeScenario = {
	onboarded: true,
	paycheck: {
		amount: 1000,
		freq: 'monthly',
		next: '2030-01-15',
		billsAccountBalanceToday: 0,
		cushion: 0
	},
	bills: [
		bill({ id: 'reg', name: 'Registration', amount: 3600, dueDate: '2030-01-01', freq: 'annual' })
	]
};

test.describe('Split / home screen', () => {
	test('shows the no-paycheck empty state linking to /paycheck', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByTestId('no-paycheck')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Add your paycheck' })).toBeVisible();
	});

	test('shows the no-bills empty state linking to add a bill', async ({ page }) => {
		await page.goto('/');
		await seed(page, {
			onboarded: true,
			paycheck: {
				amount: 1500,
				freq: 'biweekly',
				next: '2030-01-04',
				billsAccountBalanceToday: 0,
				cushion: 0
			},
			bills: []
		});
		await page.goto('/');
		await expect(page.getByTestId('no-bills')).toBeVisible();
		await expect(
			page.getByTestId('no-bills').getByRole('link', { name: 'Add a bill' })
		).toBeVisible();
	});

	test('renders the Fixture A forecast (spec §13): $836 yours, $664 into bills, $45 catch-up', async ({
		page
	}) => {
		await loadHomeAt(page, '2030-01-01', fixtureA);

		await expect(page.getByTestId('split')).toBeVisible();
		await expect(page.getByTestId('yours')).toHaveText('$836');
		await expect(page.getByTestId('into-bills')).toHaveText('$664');
		await expect(page.getByTestId('catchup')).toContainText('$45'); // catch-up renders when required
		await expect(page.getByTestId('lowest')).toHaveText('$0.00');
		await expect(page.getByTestId('forecast')).toContainText('Jan 2, 2030');
		await expect(page.getByTestId('impossible')).toHaveCount(0);
	});

	test('shows no startup catch-up when the existing balance covers the early bills', async ({
		page
	}) => {
		await loadHomeAt(page, '2030-01-01', {
			onboarded: true,
			paycheck: {
				amount: 1000,
				freq: 'monthly',
				next: '2030-01-20',
				billsAccountBalanceToday: 500,
				cushion: 0
			},
			bills: [
				bill({ id: 'ins', name: 'Insurance', amount: 300, dueDate: '2030-01-10', freq: 'monthly' })
			]
		});

		await expect(page.getByTestId('split')).toBeVisible();
		await expect(page.getByTestId('catchup')).toHaveCount(0);
	});

	test('renders the impossible-plan state when bills exceed income', async ({ page }) => {
		await loadHomeAt(page, '2030-01-01', {
			onboarded: true,
			paycheck: {
				amount: 1000,
				freq: 'monthly',
				next: '2030-01-15',
				billsAccountBalanceToday: 0,
				cushion: 0
			},
			bills: [
				bill({ id: 'big', name: 'Big bill', amount: 1300, dueDate: '2030-01-20', freq: 'monthly' })
			]
		});

		await expect(page.getByTestId('impossible')).toBeVisible();
		await expect(page.getByTestId('yours')).toHaveText('$0');
		await expect(page.getByTestId('bills-need')).toContainText('$1,300');
		await expect(page.getByTestId('shortfall')).toContainText('$300');
		await expect(page.getByTestId('split')).toHaveCount(0);
	});

	test('the proportion bar reflects the bills/yours split', async ({ page }) => {
		await loadHomeAt(page, '2030-01-01', fixtureA);
		// $664 into bills / $1,500 paycheck ≈ 44%.
		await expect(page.getByTestId('bar-bills')).toHaveAttribute('data-pct', '44');
	});

	test('"Why this amount?" adapts to whether a catch-up is needed', async ({ page }) => {
		await loadHomeAt(page, '2030-01-01', fixtureA); // catch-up needed
		await expect(page.getByTestId('why')).toContainText('Why this amount?');
		await expect(page.getByTestId('why')).toContainText('gets you started');
		await expect(page.getByTestId('why')).toContainText('$45');

		await loadHomeAt(page, '2030-01-01', {
			onboarded: true,
			paycheck: {
				amount: 2000,
				freq: 'monthly',
				next: '2030-01-05',
				billsAccountBalanceToday: 0,
				cushion: 0
			},
			bills: [bill({ id: 'gym', name: 'Gym', amount: 100, dueDate: '2030-02-15', freq: 'monthly' })]
		});
		await expect(page.getByTestId('catchup')).toHaveCount(0);
		await expect(page.getByTestId('why')).toContainText('is yours to spend');
	});

	test('the rendered forecast survives a reload', async ({ page }) => {
		await loadHomeAt(page, '2030-01-01', fixtureA);
		await expect(page.getByTestId('yours')).toHaveText('$836');

		await page.reload();
		await expect(page.getByTestId('yours')).toHaveText('$836');
	});

	test('empty-state links navigate to the right screen', async ({ page }) => {
		await page.goto('/');
		await page.getByRole('link', { name: 'Add your paycheck' }).click();
		await expect(page).toHaveURL(/\/paycheck$/);
		await expect(page.getByRole('heading', { name: 'Your paycheck' })).toBeVisible();
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

		await loadHomeAt(page, '2030-01-01', fixtureA);
		await expect(page.getByTestId('split')).toBeVisible();

		expect(offOrigin, 'the app made off-origin requests').toEqual([]);
	});

	test('recomputes when the local day changes on tab visibility, without a full reload', async ({
		page
	}) => {
		await loadHomeAt(page, '2030-01-01', dayEdgeScenario);
		await expect(page.getByTestId('catchup')).toBeVisible(); // early bill on 2030-01-01

		// A marker that a full reload would wipe — proves we recompute in place.
		await page.evaluate(() => ((window as unknown as { __kept: boolean }).__kept = true));

		// Cross local midnight into the next day, then signal the tab is visible again.
		await page.clock.setFixedTime(new Date('2030-01-02T12:00:00Z'));
		await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));

		// The early bill has fallen out of the window → the catch-up is gone.
		await expect(page.getByTestId('catchup')).toHaveCount(0);
		await expect(page.getByTestId('split')).toBeVisible();
		expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(
			true
		);
	});

	test('recomputes across local midnight while the app is left open (timer)', async ({ page }) => {
		await page.clock.install({ time: new Date('2030-01-01T23:59:40Z') });
		await page.goto('/');
		await seed(page, dayEdgeScenario);
		await page.goto('/');
		await expect(page.getByTestId('catchup')).toBeVisible();

		await page.clock.fastForward('00:01:00'); // cross midnight → the midnight timer fires

		await expect(page.getByTestId('catchup')).toHaveCount(0);
		await expect(page.getByTestId('split')).toBeVisible();
	});
});

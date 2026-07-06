import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Privacy / Trust screen: the plain-language promise + the Export / Import / Delete
// data controls, wired to the real storage + import/export + validator modules and
// driven through the real browser (IndexedDB, file upload, blob download).

// Clock-independent fixtures: paycheck is null, so the payday-in-horizon rule (which
// depends on the real "today") never applies. One bill name is intentionally untrimmed
// to prove normalization flows through import → storage → export.
const validBackup = JSON.stringify({
	onboarded: true,
	paycheck: null,
	bills: [
		{
			id: 'rent',
			name: '  Rent  ',
			amount: 900,
			dueDate: '2030-01-25',
			freq: 'monthly',
			showPayoff: false,
			balance: 0,
			apr: 0,
			stopWhenPaid: false
		},
		{
			id: 'card',
			name: 'Card',
			amount: 45,
			dueDate: '2030-01-02',
			freq: 'monthly',
			showPayoff: true,
			balance: 400,
			apr: 24,
			stopWhenPaid: false
		}
	]
});

// Rejected regardless of the real clock: `testToday` is never accepted (§12/F14).
const invalidBackup = JSON.stringify({
	onboarded: true,
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
	],
	testToday: '2030-01-01'
});

function upload(page: Page, content: string) {
	return page.setInputFiles('[data-testid="import-input"]', {
		name: 'billbuffer-backup.json',
		mimeType: 'application/json',
		buffer: Buffer.from(content, 'utf8')
	});
}

test.describe('Privacy / Trust screen', () => {
	test('renders the local-only promise and the data controls', async ({ page }) => {
		await page.goto('/privacy');
		await expect(page.getByRole('heading', { name: 'Your privacy' })).toBeVisible();

		const promise = page.getByTestId('promise');
		await expect(promise).toContainText('No account');
		await expect(promise).toContainText('No bank connection');
		await expect(promise).toContainText('No analytics');
		await expect(promise).toContainText('Your data stays on this device');

		await expect(page.getByRole('button', { name: 'Export backup' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Import backup' })).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Delete everything', exact: true })
		).toBeVisible();
	});

	test('importing a valid backup saves the normalized data', async ({ page }) => {
		await page.goto('/privacy');
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 0');

		await upload(page, validBackup);

		await expect(page.getByTestId('status')).toContainText('Backup imported');
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 2');
		await expect(page.getByTestId('held-paycheck')).toHaveText('Paycheck: not set');
	});

	test('exporting produces a normalized billbuffer-backup.json via the backup helper', async ({
		page
	}) => {
		await page.goto('/privacy');
		await upload(page, validBackup);
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 2');

		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.getByRole('button', { name: 'Export backup' }).click()
		]);

		expect(download.suggestedFilename()).toBe('billbuffer-backup.json');
		const content = readFileSync(await download.path(), 'utf8');
		const parsed = JSON.parse(content);

		expect(Object.keys(parsed).sort()).toEqual(['bills', 'onboarded', 'paycheck']);
		expect(parsed.bills).toHaveLength(2);
		// Normalization flowed through: the untrimmed "  Rent  " was stored/exported as "Rent".
		expect(parsed.bills.map((b: { name: string }) => b.name)).toContain('Rent');
		expect(content).not.toContain('  Rent  ');
		// No test-only fields ever leave.
		expect(content).not.toContain('testToday');
	});

	test('exports preexisting stored data even when Export is triggered immediately after load', async ({
		page
	}) => {
		// Seed two bills through the real import path, then reload so the component
		// remounts with the initial emptyAppData placeholder and an async IndexedDB load.
		await page.goto('/privacy');
		await upload(page, validBackup);
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 2');
		await page.reload();

		// Export as the very FIRST action after reload — no waiting for the summary.
		// The button stays disabled until the initial load resolves and onExport reloads
		// fresh data, so the file must hold the stored 2 bills, never the empty placeholder.
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			page.getByRole('button', { name: 'Export backup' }).click()
		]);
		const parsed = JSON.parse(readFileSync(await download.path(), 'utf8'));
		expect(parsed.bills).toHaveLength(2);
	});

	test('an invalid import is rejected and leaves current data untouched', async ({ page }) => {
		await page.goto('/privacy');
		await upload(page, validBackup);
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 2');

		await upload(page, invalidBackup);

		await expect(page.getByTestId('import-errors')).toBeVisible();
		await expect(page.getByTestId('import-errors')).toContainText('testToday');
		// Current data is unchanged, and no success status is shown.
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 2');
		await expect(page.getByTestId('status')).toHaveCount(0);
	});

	test('delete everything clears stored data after in-page confirmation', async ({ page }) => {
		await page.goto('/privacy');
		await upload(page, validBackup);
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 2');

		await page.getByRole('button', { name: 'Delete everything', exact: true }).click();
		await expect(page.getByTestId('delete-confirm')).toBeVisible();
		await page.getByRole('button', { name: 'Yes, delete everything' }).click();

		await expect(page.getByTestId('status')).toContainText('deleted');
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 0');

		// Persisted, not just in-memory: a reload still shows nothing.
		await page.reload();
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 0');
		await expect(page.getByTestId('held-paycheck')).toHaveText('Paycheck: not set');
	});

	test('no external network / backend / analytics request occurs during data actions', async ({
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

		await page.goto('/privacy');
		await upload(page, validBackup);
		await expect(page.getByTestId('held-bills')).toHaveText('Bills: 2');
		await page.getByRole('button', { name: 'Delete everything', exact: true }).click();
		await page.getByRole('button', { name: 'Yes, delete everything' }).click();
		await expect(page.getByTestId('status')).toContainText('deleted');

		expect(offOrigin, 'the app made off-origin requests').toEqual([]);
	});
});

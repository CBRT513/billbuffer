import { test, expect } from '@playwright/test';

// Public /trust page: prerendered static content that explains, in plain English, why a
// new user can trust BillBuffer before entering any financial information. It must read
// with no JavaScript and make no external request.

test.describe('Trust page', () => {
	test('explains the trust points in plain English, with maker + contact', async ({ page }) => {
		await page.goto('/trust');

		await expect(
			page.getByRole('heading', { level: 1, name: 'Why you can trust BillBuffer' })
		).toBeVisible();

		const points = page.getByTestId('trust-points');
		await expect(points).toContainText('saved only'); // everything stays on device
		await expect(points).toContainText('no bank link'); // never connects to your bank
		await expect(points).toContainText('create an account'); // no accounts
		await expect(points).toContainText('no trackers'); // no analytics
		await expect(points).toContainText('never sent'); // cannot see your data
		await expect(points).toContainText('Export'); // user controls export/import
		await expect(points).toContainText('Import');
		await expect(points).toContainText('only information'); // email is all we receive

		await expect(page.getByTestId('trust')).toContainText('Made by Equilibrium Labs LLC');

		const contact = page.getByTestId('trust-feedback');
		await expect(contact).toHaveText('feedback@billbuffer.app');
		await expect(contact).toHaveAttribute('href', 'mailto:feedback@billbuffer.app');
	});

	test('is a public page — no app navigation chrome', async ({ page }) => {
		await page.goto('/trust');
		await expect(page.getByTestId('trust')).toBeVisible();
		// The app header nav (Paycheck / Bills / Add a bill) is hidden on public pages.
		await expect(page.getByRole('link', { name: 'Add a bill' })).toHaveCount(0);
	});

	test('makes no external network / analytics request', async ({ page }) => {
		const offOrigin: string[] = [];
		page.on('request', (req) => {
			const url = req.url();
			const local =
				url.startsWith('http://localhost:4173') ||
				url.startsWith('blob:') ||
				url.startsWith('data:');
			if (!local) offOrigin.push(`${req.method()} ${url}`);
		});

		await page.goto('/trust');
		await expect(page.getByTestId('trust')).toBeVisible();

		expect(offOrigin, 'the trust page made off-origin requests').toEqual([]);
	});
});
